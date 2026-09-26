# StocksAI 📈

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Framework-black.svg?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5--flash-8E75B2.svg?logo=google&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**StocksAI** is a full-stack, personal financial research terminal and intelligent conversational copilot designed to eliminate hallucination in equity research. By pairing Google Gemini's reasoning engine with real-time Yahoo Finance market data and local MongoDB persistence, StocksAI translates raw financial ratios, price trends, and Wall Street targets into clean, actionable intelligence.

---

## ⚡ Architecture & Pipeline

Standard LLMs struggle with equity research due to static knowledge cutoff dates and stochastic generation errors. StocksAI enforces a deterministic, **data-first retrieval pipeline**:

```text
User Query ("Compare TSLA and NVDA P/E")
                 │
                 ▼
 ┌───────────────────────────────┐
 │ 1. Intent & Symbol Extraction │ ◄── Gemini 2.5 Flash extracts tickers
 └───────────────┬───────────────┘
                 │ [TSLA, NVDA]
                 ▼
 ┌───────────────────────────────┐
 │ 2. Live Market Fetch          │ ◄── yfinance pulls OHLCV, 52W Range, P/E,
 └───────────────┬───────────────┘     Market Cap, Analyst Targets & Live News
                 │
                 ▼
 ┌───────────────────────────────┐
 │ 3. Context Injection & Synth  │ ◄── Gemini contextualizes verified data
 └───────────────┬───────────────┘     into Markdown tables or concise bullets
                 │
                 ▼
 ┌───────────────────────────────┐
 │ 4. Persistence & Presentation │ ◄── Appended to MongoDB; rendered dynamically
 └───────────────────────────────┘     via marked.js in the terminal UI
