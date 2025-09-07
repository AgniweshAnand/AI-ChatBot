import yfinance as yf
import google.generativeai as genai
from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = "AIzaSyA6RCfUbqJli8NncTTJhdR_p5wB_rSpluA"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("models/gemini-2.5-flash-preview-05-20")

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
        hist = stock.history(period="5d")
        hist = hist.dropna(subset=["Close"])
        
        if hist.empty:
            return None, None
        price = hist["Close"].iloc[-1]
        date = hist.index[-1].date()
        return price, date
    except:
        return None, None
    
def generate_final_response(user_prompt, ticker_data):
    price_info = "\n".join(
        f"The current price of {ticker} is {price:.2f} as of {date}."
        for ticker, price, date in ticker_data
    )
    
    prompt = f"""
    The user asked: "{user_prompt}"
    {price_info}
    Based on this, generate a friendly and informative financial response, comparing or summarizing the stock performance, make sure the response is crisp and informative.
    """
    response = model.generate_content(prompt)
    return response.text.strip()

def generate_other_response(user_prompt):
    prompt = f"""
    The user asked a question related to finance or stock but no specific stock ticker were identified:
    "user_prompt"
    
    providde a helpful and intelligent response based on general financial knowledge, trends, investment strategies, or market insights. Be helpful to the user and make sure the responce is not so much long that it seems lenthy.
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
        price, date = fetch_stock_price(ticker)
        if price is not None:
            ticker_data.append((ticker, price, date))
    
    if not ticker_data:
        final_output = "No valid stock data available for the tickers mentioned."
        return jsonify({'response': final_output})
    
    final_output = generate_final_response(user_input, ticker_data)
    return jsonify({'response': final_output})


if __name__ == "__main__":
    app.run(debug=True, port=5000)