import os
import re
from dotenv import load_dotenv  # type: ignore
import yfinance as yf
import google.generativeai as genai
from flask import Flask, request, jsonify  # type: ignore
from flask_cors import CORS  # type: ignore

# Import DB functions from our standalone db.py module
from db import (
    create_chat_session,
    add_message_to_session,
    get_all_sessions,
    get_session_messages,
    delete_session
)

load_dotenv()

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = os.getenv("GEMINI_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing. Check your .env file.")

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-3.5-flash")


def format_large_number(num):
    """Converts large numeric values into clean readable currency figures ($T, $B, $M)."""
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


def extract_ticker_from_prompt(prompt_text):
    """Extracts clean Yahoo Finance stock symbols using Gemini."""
    prompt = f"""
    Extract ONLY the Yahoo Finance stock ticker symbols from the user prompt:
    "{prompt_text}"
    
    Rules:
    - Respond ONLY with a clean comma-separated list of symbols (e.g., TSLA, AAPL, NVDA, RELIANCE.NS, TCS.NS).
    - If no specific stock is mentioned, reply with exactly: UNKNOWN
    - Do not add explanations, sentences, or markdown blocks.
    """
    response = model.generate_content(prompt)
    raw = response.text.strip().replace("`", "").replace("\n", "")

    if "UNKNOWN" in raw.upper() or not raw:
        return []

    tickers = [re.sub(r"[^A-Z0-9\.\^=-]", "", t.upper()) for t in raw.split(",") if t.strip()]
    return [t for t in tickers if t]


def fetch_stock_price(ticker):
    """Fetches real-time price action, 52W range, valuation, analyst targets, and news."""
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1y", interval="1d", auto_adjust=False)

        if hist is None or hist.empty:
            hist = stock.history(period="5d", interval="1d")

        if hist is None or hist.empty:
            print(f"[DEBUG] No history returned for {ticker}")
            return None

        hist = hist.dropna(subset=["Close"])
        if hist.empty:
            return None

        price = float(hist["Close"].iloc[-1])
        date = hist.index[-1].strftime("%Y-%m-%d")
        week_52_high = float(hist["High"].max()) if "High" in hist else price
        week_52_low = float(hist["Low"].min()) if "Low" in hist else price

        # 1. Day Change calculation
        if len(hist) >= 2:
            prev_close = float(hist["Close"].iloc[-2])
            day_change = price - prev_close
            day_change_pct = (day_change / prev_close) * 100
        else:
            day_change = 0.0
            day_change_pct = 0.0

        # 2. Fundamentals & Valuation
        info = stock.info or {}
        market_cap_raw = info.get("marketCap")
        market_cap = format_large_number(market_cap_raw)

        pe_ratio = info.get("trailingPE") or info.get("forwardPE")
        pe_formatted = f"{pe_ratio:.2f}x" if pe_ratio else "N/A"

        div_yield = info.get("dividendYield")
        div_formatted = f"{(div_yield * 100):.2f}%" if div_yield else "0.00% (No dividend)"

        # 3. Wall Street Analyst Consensus & Targets
        rec_raw = info.get("recommendationKey")
        recommendation = rec_raw.replace("_", " ").title() if rec_raw else "N/A"
        analysts_count = info.get("numberOfAnalystOpinions")
        analyst_label = f"{recommendation} ({analysts_count} analysts)" if analysts_count else recommendation

        target_mean = info.get("targetMeanPrice")
        if target_mean and price > 0:
            upside_pct = ((target_mean - price) / price) * 100
            upside_sign = "+" if upside_pct >= 0 else ""
            target_str = f"${target_mean:.2f} ({upside_sign}{upside_pct:.2f}% potential)"
        else:
            target_str = "N/A"

        # 4. Live News (Top 3 Headlines)
        news_items = []
        raw_news = getattr(stock, "news", []) or []
        for article in raw_news[:3]:
            title = article.get("title") or (
                article.get("content", {}).get("title")
                if isinstance(article.get("content"), dict)
                else None
            )
            publisher = article.get("publisher") or (
                article.get("content", {}).get("provider", {}).get("displayName")
                if isinstance(article.get("content"), dict)
                else None
            )
            if title:
                news_items.append(f'"{title}" ({publisher or "News"})')

        news_summary = " | ".join(news_items) if news_items else "No recent headlines available"

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
            "dividend_yield": div_formatted,
            "recommendation": analyst_label,
            "target_price": target_str,
            "news": news_summary,
        }
    except Exception as e:
        print(f"[ERROR] Failed fetching data for {ticker}: {e}")
        return None


def generate_final_response(user_prompt, ticker_data, action_mode=None):
    """Generates an intent-adaptive response tailored specifically to what the user asked."""
    data_blocks = []
    for d in ticker_data:
        sign = "+" if d["day_change"] >= 0 else ""
        indicator = "🟢 Up" if d["day_change"] >= 0 else "🔴 Down"
        data_blocks.append(
            f"=== DATA FOR {d['ticker']} ===\n"
            f"- Current Price: ${d['price']:.2f} (Date: {d['date']})\n"
            f"- Today's Change: {sign}${d['day_change']:.2f} ({sign}{d['day_change_pct']:.2f}%) [{indicator}]\n"
            f"- 52-Week Range: ${d['low']:.2f} - ${d['high']:.2f}\n"
            f"- Market Cap: {d['market_cap']}\n"
            f"- P/E Ratio: {d['pe_ratio']}\n"
            f"- Dividend Yield: {d['dividend_yield']}\n"
            f"- Wall Street Consensus: {d['recommendation']}\n"
            f"- 12-Month Price Target: {d['target_price']}\n"
            f"- Recent Headlines: {d['news']}\n"
        )

    market_data = "\n\n".join(data_blocks)
    num_stocks = len(ticker_data)
    mode_hint = f"Active Action Mode: [{action_mode}]\n" if action_mode else ""

    prompt = f"""
    You are StocksAI, an intelligent, conversational financial assistant.
    
    {mode_hint}User Query: "{user_prompt}"
    
    Available Live Market Data:
    {market_data}
    
    ### Formatting & Relevance Instructions
    
    1. **Direct & Intent-Specific Answers:**
       - Pay close attention to what the user explicitly asked for. If the user asks for a **single specific metric** (e.g. only P/E ratio, only market cap, or only today's price), **DO NOT dump the entire full report**.
       - State the requested figure directly in bold, explain what it means in 1 brief sentence, and bring in only 1-2 closely related supporting numbers.
    
    2. **Multi-Stock Comparisons ({num_stocks} stocks):**
       - If {num_stocks} >= 2 or if the user asks for a comparison, render a clean Markdown table comparing the key metrics side-by-side, followed by a crisp 2-sentence comparative takeaway.
    
    3. **General / Broad Analysis Queries:**
       - If the user asks a broad question (e.g. "How is Tesla doing?", "Analyze NVDA", "Stock report on Apple"), provide the structured overview with clean bold headers and short bullet points (Price Action, Valuation, Wall Street Consensus, News & Sentiment).
    
    4. **Tone & Formatting:**
       - Highlight company names, tickers, and key numerical figures in bold (e.g., **$224.23**, **33.4x**).
       - Keep answers sharp and end with a natural, single-line follow-up question related to the topic.
    """
    response = model.generate_content(prompt)
    return response.text.strip()


def generate_other_response(user_prompt):
    """Handles general financial questions where no specific stock ticker is mentioned."""
    prompt = f"""
    The user asked a general finance or market question:
    "{user_prompt}"
    
    Provide a helpful, crisp response using clean Markdown with short bullet points where applicable. 
    Keep it concise and avoid overly long essays.
    """
    response = model.generate_content(prompt)
    return response.text.strip()


# ==========================================
# MongoDB Chat History REST API Endpoints
# ==========================================

@app.route("/api/chats", methods=["GET"])
def list_chats():
    """Returns a list of past chat sessions for the sidebar."""
    sessions = get_all_sessions()
    return jsonify({"sessions": sessions})


@app.route("/api/chats/<session_id>", methods=["GET"])
def get_chat(session_id):
    """Returns the full conversation log for a specific chat session."""
    session = get_session_messages(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify({"session": session})


@app.route("/api/chats/<session_id>", methods=["DELETE"])
def remove_chat(session_id):
    """Deletes a chat session from MongoDB."""
    success = delete_session(session_id)
    if not success:
        return jsonify({"error": "Failed to delete session"}), 400
    return jsonify({"success": True})


# ==========================================
# Main /ask Endpoint (with Persistence)
# ==========================================

@app.route("/ask", methods=["POST"])
def handle_request():
    data = request.get_json() or {}
    user_input = data.get("message", "")
    action_mode = data.get("action_mode", None)
    session_id = data.get("session_id", None)

    if not user_input and not action_mode:
        return jsonify({"response": "Please provide a message or choose an action mode."})

    query_text = f"{action_mode} {user_input}".strip() if action_mode else user_input

    # 1. Ensure a session exists in MongoDB
    if not session_id:
        session_id = create_chat_session(user_input or action_mode, action_mode)

    # 2. Record the user message
    add_message_to_session(session_id, "user", user_input, action_mode)

    # 3. Process Tickers & Generate Response
    tickers = extract_ticker_from_prompt(query_text)

    if not tickers:
        bot_reply = generate_other_response(query_text)
        add_message_to_session(session_id, "bot", bot_reply)
        return jsonify({"response": bot_reply, "session_id": session_id})

    ticker_data = []
    for ticker in tickers:
        stock_data = fetch_stock_price(ticker)
        if stock_data is not None:
            ticker_data.append(stock_data)

    if not ticker_data:
        bot_reply = "No valid stock data available for the tickers mentioned."
        add_message_to_session(session_id, "bot", bot_reply)
        return jsonify({"response": bot_reply, "session_id": session_id})

    bot_reply = generate_final_response(query_text, ticker_data, action_mode)

    # 4. Record the bot response
    add_message_to_session(session_id, "bot", bot_reply)

    return jsonify({"response": bot_reply, "session_id": session_id})


if __name__ == "__main__":
    app.run(debug=True, port=5000)