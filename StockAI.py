import os
import re
from dotenv import load_dotenv
import yfinance as yf
import google.generativeai as genai
from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS  # type: ignore

load_dotenv()

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
if not GOOGLE_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing. Check your .env file.")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-3.5-flash-lite")

import re

def extract_ticker_from_prompt(prompt_text):
    prompt = f"""
    Extract ONLY the Yahoo Finance stock ticker symbols from the user prompt:
    "{prompt_text}"
    
    Rules:
    - Respond ONLY with a clean comma-separated list of symbols (e.g. AAPL, TSLA, NVDA, RELIANCE.NS, TCS.NS).
    - If no specific stock is mentioned, reply with exactly: UNKNOWN
    - Do not add explanations, prefixes, or markdown.
    """
    response = model.generate_content(prompt)
    raw = response.text.strip().replace("`", "").replace("\n", "")
    
    if "UNKNOWN" in raw.upper() or not raw:
        return []
    
    # Strip any extra punctuation or spaces
    tickers = [re.sub(r'[^A-Z0-9\.\^=-]', '', t.upper()) for t in raw.split(",") if t.strip()]
    return [t for t in tickers if t]

def format_large_number(num):
    if num is None:
        return "N/A"
    try:
        num = float(num)
        if num >= 1e12:
            return f"${num / 1e12:.2f}T"
        elif num >= 1e9:
            return f"${num / 1e9:.2f}B"
        elif num >= 1e6:
            return f"${num / 1e6:.2f}M"
        return f"${num:,.2f}"
    except Exception:
        return "N/A"

def fetch_stock_price(ticker):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1y", interval="1d", auto_adjust=False)
        
        if hist is None or hist.empty:
            hist = stock.history(period="5d", interval="1d")
            
        if hist is None or hist.empty:
            return None
            
        hist = hist.dropna(subset=["Close"])
        if hist.empty:
            return None

        price = float(hist["Close"].iloc[-1])
        date = hist.index[-1].strftime('%Y-%m-%d')
        week_52_high = float(hist["High"].max()) if "High" in hist else price
        week_52_low = float(hist["Low"].min()) if "Low" in hist else price
        
        # Day Change
        if len(hist) >= 2:
            prev_close = float(hist["Close"].iloc[-2])
            day_change = price - prev_close
            day_change_pct = (day_change / prev_close) * 100
        else:
            day_change = 0.0
            day_change_pct = 0.0

        # Fundamentals via stock.info
        info = stock.info or {}
        market_cap_raw = info.get("marketCap")
        market_cap = format_large_number(market_cap_raw)
        
        pe_ratio = info.get("trailingPE") or info.get("forwardPE")
        pe_formatted = f"{pe_ratio:.2f}x" if pe_ratio else "N/A (No positive earnings)"

        div_yield = info.get("dividendYield")
        div_formatted = f"{(div_yield * 100):.2f}%" if div_yield else "0.00% (No dividend)"
        
        return {
            "ticker": ticker,
            "price": price,
            "date": date,
            "high": week_52_high,
            "low": week_52_low,
            "day_change": day_change,
            "day_change_pct": day_change_pct,
            "market_cap": market_cap,
            "pe_ratio": pe_formatted,
            "dividend_yield": div_formatted
        }
    except Exception as e:
        print(f"[ERROR] Failed fetching data for {ticker}: {e}")
        return None
    
def generate_final_response(user_prompt, ticker_data):
    price_info_list = []
    for data in ticker_data:
        sign = "+" if data["day_change"] >= 0 else ""
        indicator = "🟢 Up" if data["day_change"] >= 0 else "🔴 Down"
        
        price_info_list.append(
            f"Stock: {data['ticker']} | Price: ${data['price']:.2f} (Date: {data['date']}) | "
            f"Today's Change: {sign}${data['day_change']:.2f} ({sign}{data['day_change_pct']:.2f}%) [{indicator}] | "
            f"52-Week Range: ${data['low']:.2f} - ${data['high']:.2f} | "
            f"Market Cap: {data['market_cap']} | P/E Ratio: {data['pe_ratio']} | Dividend Yield: {data['dividend_yield']}"
        )
    
    price_info = "\n".join(price_info_list)
    
    prompt = f"""
    The user asked: "{user_prompt}"
    
    Market Data:
    {price_info}
    
    Format the response strictly with Markdown:
    - **Header:** State the company name/ticker and current price in bold.
    - **Key Highlights (Bullet points):**
      * **Current Price:** $X.XX
      * **Today's Change:** +$X.XX (+X.XX%) 🟢 OR -$X.XX (-X.XX%) 🔴
      * **52-Week Range:** Low $X.XX – High $X.XX
    - **Valuation & Fundamentals (Bullet points):**
      * **Market Cap:** $X.XX B/T
      * **P/E Ratio:** X.XX
      * **Dividend Yield:** X.XX%
    - **Analysis:** 1-2 concise sentences summarizing the stock's momentum and valuation context.
    - **Closing:** A short single-line follow-up asking what they want to explore next.

    Do not output dense, unbroken paragraphs.
    """
    response = model.generate_content(prompt)
    return response.text.strip()

def generate_other_response(user_prompt):
    prompt = f"""
    The user asked a general finance or market question:
    "{user_prompt}"
    
    Provide a helpful, crisp response using clean Markdown with short bullet points where applicable. 
    Keep it concise and avoid overly long essays.
    """
    response = model.generate_content(prompt)
    return response.text.strip()

@app.route('/ask', methods=['POST'])
def handle_request():
    data = request.get_json()
    user_input = data.get('message', '')

    if not user_input:
        return jsonify({'response': 'Please provide a message.'})
    
    tickers = extract_ticker_from_prompt(user_input)
    
    if not tickers:
        other_reply = generate_other_response(user_input)
        return jsonify({'response': other_reply})
    
    ticker_data = []
    for ticker in tickers:
        stock_data = fetch_stock_price(ticker)
        if stock_data is not None:
            ticker_data.append(stock_data)
    
    if not ticker_data:
        final_output = "No valid stock data available for the tickers mentioned."
        return jsonify({'response': final_output})
    
    final_output = generate_final_response(user_input, ticker_data)
    return jsonify({'response': final_output})

if __name__ == "__main__":
    app.run(debug=True, port=5000)