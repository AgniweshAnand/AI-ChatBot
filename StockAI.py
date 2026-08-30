import os
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

def extract_ticker_from_prompt(prompt_text):
    prompt = f"""
    Extract all stock ticker symbols mentioned in user prompt:
    "{prompt_text}"
    Respond with a comma separated list of Yahoo Finance tickers (e.g., TSLA, AAPL, RELIANCE.NS). If none, return "UNKNOWN".
    """
    response = model.generate_content(prompt)
    tickers_raw = response.text.strip().replace("\n", "")
    if "UNKNOWN" in tickers_raw.upper():
        return []
    tickers = [t.strip().upper() for t in tickers_raw.split(",") if t.strip()]
    return tickers

def fetch_stock_price(ticker):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1y")
        hist = hist.dropna(subset=["Close", "High", "Low"])
        
        if hist.empty:
            return None, None, None, None
        price = hist["Close"].iloc[-1]
        date = hist.index[-1].date()
        
        week_52_high = hist["High"].max()
        week_52_low = hist["Low"].min()
        
        return price, date, week_52_high, week_52_low 
    except Exception:
        return None, None, None, None

def generate_final_response(user_prompt, ticker_data):
    price_info = "\n".join(
        f"Stock: {ticker} | Current Price: {price:.2f} (Date: {date}) | 52-Week High: {high:.2f} | 52-Week Low: {low:.2f}"
        for ticker, price, date, high, low in ticker_data
    )
    
    prompt = f"""
    The user asked: "{user_prompt}"
    
    Market Data:
    {price_info}
    
    Based on this data, generate a friendly and informative financial response summarizing the stock performance and its position relative to its 52-week high and low.
    Keep the response crisp and clear. Add a closing line asking if they would like to know more or compare another stock.
    """
    response = model.generate_content(prompt)
    return response.text.strip()

def generate_other_response(user_prompt):
    prompt = f"""
    The user asked a question related to finance or stock but no specific stock ticker were identified:
    "{user_prompt}"
    
    providde a helpful and intelligent response based on general financial knowledge, trends, investment strategies, or market insights. Be helpful to the user and make sure the responce is not so much long. after giving a short response ask the user if they want to know about the recent trends or the prides of the stock market, make sure do not overexplain and write too long answers until the user prompt specifies to, if the user is telling to do a comparison or even if the prompt is telling to tell about the priice try to provide the price or the other details in bullet points along with the description of what the user specified to do.
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
        price, date, week_52_high, week_52_low = fetch_stock_price(ticker)
        if price is not None:
            ticker_data.append((ticker, price, date, week_52_high, week_52_low))
    
    if not ticker_data:
        final_output = "No valid stock data available for the tickers mentioned."
        return jsonify({'response': final_output})
    
    final_output = generate_final_response(user_input, ticker_data)
    return jsonify({'response': final_output})

if __name__ == "__main__":
    app.run(debug=True, port=5000)