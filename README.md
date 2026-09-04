# Stock Market Future - AI-Powered Prediction Platform 📈🚀

An advanced stock market prediction and analytics platform featuring machine learning models (LSTM + Transformer), interactive technical charts, news sentiment analysis, and AMFI mutual funds tracking.

---

## ✨ Features

- 🧠 **AI Predictions**: Hybrid ensemble (LSTM + Transformer) providing price targets, trend direction (UP/DOWN), signal (BUY/SELL/HOLD), entry zones, targets, and stop-loss levels.
- 📊 **Interactive Charts**: Lightweight Charts with line & candlestick series, multi-timeframe analysis (1m, 5m, 15m, 1h, 1d, 1w), and technical indicators (EMA, RSI, MACD).
- 📰 **News Sentiment**: Real-time market sentiment analysis from financial news sources.
- 💼 **AMFI Mutual Funds**: Search and explore Indian mutual funds, NAV values, categories, and performance dates.
- ⚡ **GitHub Pages Ready**: Fully configured for automated static deployment with relative pathing and client-side routing support.
- 🎯 **Dual Mode Architecture**: Works seamlessly connected to a live FastAPI backend or in standalone demo mode.
- 🔑 **Flexible Authentication**: Firebase Auth (Email/Password, Google OAuth) plus one-click Instant Guest / Demo access.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS, Radix UI, Lightweight Charts, Lucide Icons, Sonner, React Router v7
- **Backend (Optional API)**: FastAPI, Python 3.10+, PyTorch/LSTM, Motor (Async MongoDB), yfinance, AMFI parser
- **Hosting & CI/CD**: GitHub Pages, GitHub Actions (`deploy.yml`)

---

## 🚀 Quick Start & Local Development

### 1. Frontend
```bash
cd frontend
yarn install
yarn start
```
The app will run at `http://localhost:3000`.

### 2. Backend (Optional)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.server:app --reload --port 8000
```

---

## 📦 Deployment to GitHub Pages

For detailed step-by-step instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Automated (GitHub Actions)
Push changes to the `main` branch. GitHub Actions will build and deploy automatically to GitHub Pages.

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

### Manual
```bash
cd frontend
yarn deploy
```
