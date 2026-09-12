# StocksAI 📈

StocksAI is a personal financial research terminal that turns complicated market data into clear, conversational insights. It combines live stock market data with Google Gemini to give you reliable, real-time answers about company performance, valuation metrics, and market trends.

---

## 💡 Why StocksAI?

Standard AI chatbots often provide outdated or inaccurate financial figures because stock prices fluctuate constantly. StocksAI fixes this by using a **data-first approach**:

1. It extracts the company or ticker symbol from your question.
2. It fetches live, verified market data directly from Yahoo Finance.
3. It hands that fresh data to Google Gemini to format and explain the numbers clearly.

The result is accurate, hallucination-free financial analysis tailored to your question.

---

## ✨ Features

- **Real-Time Stock Summaries:** Check live prices, today's price action, 52-week ranges, and market capitalization.
- **Fundamental & Valuation Metrics:** View P/E ratios, dividend yields, and Wall Street analyst target consensus.
- **Side-by-Side Stock Comparisons:** Ask about multiple tickers (e.g., *"Compare NVDA and AMD"*), and StocksAI formats the figures into a clean side-by-side comparison table.
- **Direct & Focused Answers:** Ask for a single metric (e.g., *"What is Apple's market cap?"*), and get a direct answer without unnecessary clutter.
- **Latest Market News:** Pulls recent headlines for each stock to provide immediate market context.
- **Chat History & Sessions:** Automatically saves all your past analyses to a sidebar powered by MongoDB so you can pick up where you left off.
- **Minimalist Dark Terminal:** A dark-mode interface with dynamic prompt suggestions, quick-action badges, and responsive design.

---

## 🛠️ Built With

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fast, lightweight, zero build setup)
- **Markdown Engine:** `marked.js` (Renders bold metrics and comparison tables)
- **Backend:** Python & Flask (Coordinates market data and AI processing)
- **Market Data Engine:** Yahoo Finance (`yfinance`)
- **AI / LLM:** Google Gemini (`gemini-2.5-flash`)
- **Database:** MongoDB (`pymongo`) for saving chat history and sessions

---

## 📁 File Structure & Component Roles

| File | Role & Responsibility |
|---|---|
| **`StockAI.py`** | **Core Backend Server:** The main Flask application. It defines the `/ask` and chat history API routes, handles two-stage Gemini prompting (ticker extraction and final response synthesis), and pulls live prices, metrics, and news from `yfinance`. |
| **`db.py`** | **Database & Persistence Layer:** Connects to MongoDB using `pymongo`. Handles session creation, appending user/bot messages, updating timestamps, fetching sidebar chat history, and converting MongoDB BSON objects into JSON-compatible formats. |
| **`Index.html`** | **Main Terminal Interface:** The primary single-page layout. Contains the chat display area, collapsible sidebar for past conversations, dynamic headline hero banner, quick-action analysis buttons, and the message input box. |
| **`Style.css`** | **Terminal Styling & Animations:** Implements the dark terminal theme using CSS variables. Manages message bubble styles, Markdown tables, the typing dot animation, sidebar collapse transitions, and mobile drawer responsiveness. |
| **`Script.js`** | **Frontend Client Logic:** Manages the user interface state. Handles sending messages to the backend, rendering Markdown via `marked.js`, controlling the headline text rotator, managing active analysis badges, and syncing past chat sessions with the sidebar. |
| **`login.html`** | **Authentication Page:** Provides a clean sign-in screen with options for standard email/password authentication, social login buttons, and a direct guest access skip link. |
| **`login.css`** | **Auth Styling:** Houses custom styles, input focus states, checkmarks, status banners, and layouts specific to the login card. |
| **`login.js`** | **Auth Form Handling:** Controls password visibility toggling, input validation, and sending login credentials to the backend server. |
| **`requirements.txt`** | **Dependencies:** Lists all required Python packages (`flask`, `flask-cors`, `yfinance`, `google-generativeai`, `pymongo`, `python-dotenv`). |
