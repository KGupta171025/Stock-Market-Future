from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import pandas as pd

# Add backend to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import custom modules
from backend.config.settings import settings
from backend.utils.firebase_admin import initialize_firebase, verify_token
from backend.utils.market_calendar import market_calendar
from backend.data.market_data import market_data
from backend.data.amfi_data import amfi_data
from backend.features.indicators import indicators
from backend.ml.lstm_model import lstm_inference
from backend.ml.transformer_model import transformer_inference
from backend.ml.news_sentiment import news_analyzer

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialize Firebase
initialize_firebase()

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Stock Market Prediction API")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")


# Models
class AnalysisRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    timeframe: str = "1day"
    realtime: bool = False
    currency: str = "INR"


class StockSearch(BaseModel):
    query: str


# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth helper
def get_user_from_token(authorization: Optional[str] = None):
    if not authorization:
        return None
    try:
        token = authorization.replace("Bearer ", "")
        user = verify_token(token)
        return user
    except:
        return None


# Routes
@api_router.get("/")
async def root():
    return {"message": "Stock Market Prediction API", "version": "1.0"}


@api_router.get("/market/status")
async def get_market_status():
    """Get current market status"""
    status = market_calendar.get_market_status()
    return status


@api_router.get("/stocks/list")
async def get_stocks():
    """Get list of available stocks"""
    stocks = market_data.get_stock_list()
    return {"stocks": stocks}


@api_router.get("/stocks/search")
async def search_stocks(q: str):
    """Search stocks by name or symbol"""
    stocks = market_data.get_stock_list()
    query_lower = q.lower()
    filtered = [s for s in stocks if query_lower in s['symbol'].lower() or query_lower in s['name'].lower()]
    return {"results": filtered}


@api_router.get("/stocks/price")
async def get_stock_price(symbol: str, exchange: str = "NSE"):
    """Get current stock price"""
    price_data = market_data.get_nse_stock_price(symbol)
    if not price_data:
        raise HTTPException(status_code=404, detail="Stock not found")
    return price_data


@api_router.get("/indices")
async def get_indices():
    """Get market indices (NIFTY, SENSEX, BANK NIFTY)"""
    indices = market_data.get_indices()
    return {"indices": indices}


@api_router.get("/us/market/status")
async def get_us_market_status():
    """Get US market status"""
    from datetime import datetime
    import pytz
    try:
        et = pytz.timezone('US/Eastern')
        now_et = datetime.now(et)
        is_weekday = now_et.weekday() < 5
        market_open_time = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
        market_close_time = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
        is_open = is_weekday and (market_open_time <= now_et <= market_close_time)
        return {
            "is_open": is_open,
            "market": "NYSE/NASDAQ (US)",
            "current_time_est": now_et.strftime('%I:%M:%S %p %Z'),
            "session": "Regular Trading" if is_open else "Market Closed",
            "status": "Live" if is_open else "Market Closed"
        }
    except Exception:
        return {
            "is_open": False,
            "market": "NYSE/NASDAQ (US)",
            "session": "Market Closed",
            "status": "Market Closed"
        }


@api_router.get("/us/stocks/list")
async def get_us_stocks():
    """Get list of popular US stocks"""
    stocks = market_data.get_us_stocks()
    return {"stocks": stocks}


@api_router.get("/us/indices")
async def get_us_indices():
    """Get popular US indices"""
    indices = [
        {"symbol": "S&P 500", "name": "S&P 500 Benchmark Index", "exchange": "NYSE/NASDAQ Index", "price": 5782.50, "change": 38.40, "change_percent": 0.67, "currency": "USD"},
        {"symbol": "NASDAQ", "name": "NASDAQ Composite Index", "exchange": "NASDAQ Index", "price": 18342.80, "change": 154.20, "change_percent": 0.85, "currency": "USD"},
        {"symbol": "DOW JONES", "name": "Dow Jones Industrial Average", "exchange": "NYSE Index", "price": 42114.20, "change": 134.80, "change_percent": 0.32, "currency": "USD"},
        {"symbol": "RUSSELL 2000", "name": "Russell 2000 Small-Cap Index", "exchange": "US Index", "price": 2220.40, "change": 9.80, "change_percent": 0.44, "currency": "USD"}
    ]
    return {"indices": indices}


@api_router.get("/us/stocks/search")
async def search_us_stocks(q: str):
    """Search US stocks"""
    stocks = market_data.get_us_stocks()
    query_lower = q.lower()
    filtered = [s for s in stocks if query_lower in s['symbol'].lower() or query_lower in s['name'].lower()]
    return {"results": filtered}


@api_router.post("/analysis/analyze")
async def analyze_stock(request: AnalysisRequest):
    """
    Main analysis endpoint
    - Checks market status
    - Fetches historical data
    - Calculates indicators
    - Runs ML predictions
    - Returns comprehensive analysis
    """
    # Check market status
    market_status = market_calendar.get_market_status()
    is_market_open = market_status['is_open']
    
    # Validate real-time request
    if request.realtime and not is_market_open:
        raise HTTPException(
            status_code=400, 
            detail="Real-time analysis not available when market is closed"
        )
    
    # Fetch time series data
    df = market_data.get_time_series(request.symbol, request.timeframe)
    
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="Unable to fetch stock data")
    
    # Calculate indicators
    df_with_indicators = indicators.calculate_all_indicators(df)
    
    # Get ML predictions
    lstm_pred = lstm_inference.predict_next(df)
    transformer_pred = transformer_inference.predict_trend(df)
    
    # Get news sentiment
    sentiment = news_analyzer.aggregate_sentiment(request.symbol)
    news = news_analyzer.get_stock_news(request.symbol)
    
    # Combine predictions
    current_price = df['close'].iloc[-1]
    predicted_price = lstm_pred.get('predicted_price', current_price)
    
    # Determine signal
    trend = lstm_pred.get('trend', 'NEUTRAL')
    signal = "BUY" if trend == "UP" else "SELL" if trend == "DOWN" else "HOLD"
    
    # Calculate entry, target, stop loss
    if trend == "UP":
        entry = [current_price * 0.98, current_price * 1.0]
        target = [current_price * 1.05, current_price * 1.10]
        stop_loss = current_price * 0.95
    else:
        entry = [current_price * 1.0, current_price * 1.02]
        target = [current_price * 0.95, current_price * 0.90]
        stop_loss = current_price * 1.05
    
    # Prepare chart data
    chart_data = df_with_indicators.tail(100).to_dict('records')
    
    # Clean up chart data for JSON serialization
    for record in chart_data:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
    
    response = {
        "symbol": request.symbol,
        "exchange": request.exchange,
        "market_status": market_status,
        "realtime": request.realtime and is_market_open,
        "currency": request.currency,
        "current_price": round(current_price, 2),
        "chart_data": chart_data,
        "prediction": {
            "trend": trend,
            "signal": signal,
            "confidence": lstm_pred.get('confidence', 0.5),
            "predicted_price": round(predicted_price, 2),
            "entry": [round(e, 2) for e in entry],
            "target": [round(t, 2) for t in target],
            "stop_loss": round(stop_loss, 2)
        },
        "sentiment": sentiment,
        "news": news,
        "indicators": {
            "rsi": float(df_with_indicators['rsi'].iloc[-1]) if not pd.isna(df_with_indicators['rsi'].iloc[-1]) else None,
            "macd": float(df_with_indicators['macd'].iloc[-1]) if not pd.isna(df_with_indicators['macd'].iloc[-1]) else None,
        }
    }
    
    return response


@api_router.get("/mutual_funds/list")
async def get_mutual_funds(limit: int = 50):
    """Get list of mutual funds"""
    funds = amfi_data.fetch_mutual_funds()
    return {"funds": funds[:limit], "total": len(funds)}


@api_router.get("/mutual_funds/search")
async def search_mutual_funds(q: str):
    """Search mutual funds"""
    results = amfi_data.search_mutual_fund(q)
    return {"results": results}


# Include router
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
