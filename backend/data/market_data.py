import requests
from typing import Optional, Dict, List
from backend.config.settings import settings
import pandas as pd
from datetime import datetime, timedelta
import yfinance as yf

class MarketDataFetcher:
    def __init__(self):
        self.rapidapi_key = settings.RAPIDAPI_KEY
        self.rapidapi_host = settings.RAPIDAPI_HOST
    
    def get_nse_stock_price(self, symbol: str) -> Optional[Dict]:
        """
        Fetch current price for NSE stock using RapidAPI (Twelve Data)
        """
        url = f"https://{self.rapidapi_host}/price"
        querystring = {"symbol": symbol, "exchange": "NSE"}
        headers = {
            "X-RapidAPI-Key": self.rapidapi_key,
            "X-RapidAPI-Host": self.rapidapi_host
        }
        
        try:
            response = requests.get(url, headers=headers, params=querystring, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching NSE price for {symbol}: {e}")
            return None
    
    def get_time_series(self, symbol: str, interval: str = '1day', outputsize: int = 100) -> Optional[pd.DataFrame]:
        """
        Fetch time series data for stock
        interval: 1min, 5min, 15min, 30min, 45min, 1h, 2h, 4h, 1day, 1week, 1month
        """
        url = f"https://{self.rapidapi_host}/time_series"
        querystring = {
            "symbol": symbol,
            "interval": interval,
            "outputsize": outputsize,
            "format": "json"
        }
        headers = {
            "X-RapidAPI-Key": self.rapidapi_key,
            "X-RapidAPI-Host": self.rapidapi_host
        }
        
        try:
            response = requests.get(url, headers=headers, params=querystring, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'values' in data:
                df = pd.DataFrame(data['values'])
                df['datetime'] = pd.to_datetime(df['datetime'])
                df = df.sort_values('datetime')
                # Convert string columns to float
                for col in ['open', 'high', 'low', 'close', 'volume']:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                return df
            return None
        except Exception as e:
            print(f"Error fetching time series for {symbol}: {e}")
            # Fallback to yfinance
            return self._get_yfinance_data(symbol, interval)
    
    def _get_yfinance_data(self, symbol: str, interval: str = '1d'):
        """
        Fallback to yfinance for data fetching
        """
        try:
            # Map intervals
            interval_map = {
                '1min': '1m', '5min': '5m', '15min': '15m', '30min': '30m',
                '1h': '1h', '1day': '1d', '1week': '1wk', '1month': '1mo'
            }
            yf_interval = interval_map.get(interval, '1d')
            
            ticker = yf.Ticker(f"{symbol}.NS")  # NSE stocks
            df = ticker.history(period='3mo', interval=yf_interval)
            
            if not df.empty:
                df = df.reset_index()
                df.columns = [col.lower() for col in df.columns]
                df.rename(columns={'date': 'datetime'}, inplace=True)
                return df
            return None
        except Exception as e:
            print(f"yfinance fallback failed for {symbol}: {e}")
            return None
    
    def get_stock_list(self) -> List[Dict]:
        """
        Return list of popular NSE stocks
        """
        # Top NSE stocks
        stocks = [
            {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE"},
            {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE"},
            {"symbol": "HDFCBANK", "name": "HDFC Bank", "exchange": "NSE"},
            {"symbol": "INFY", "name": "Infosys", "exchange": "NSE"},
            {"symbol": "HINDUNILVR", "name": "Hindustan Unilever", "exchange": "NSE"},
            {"symbol": "ICICIBANK", "name": "ICICI Bank", "exchange": "NSE"},
            {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE"},
            {"symbol": "BHARTIARTL", "name": "Bharti Airtel", "exchange": "NSE"},
            {"symbol": "ITC", "name": "ITC Limited", "exchange": "NSE"},
            {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank", "exchange": "NSE"},
        ]
        return stocks
    
    def get_indices(self) -> List[Dict]:
        """
        Fetch Indian market indices
        """
        indices = ['NIFTY', 'SENSEX', 'BANKNIFTY']
        results = []
        
        for idx in indices:
            try:
                # Use yfinance for indices
                symbol_map = {
                    'NIFTY': '^NSEI',
                    'SENSEX': '^BSESN',
                    'BANKNIFTY': '^NSEBANK'
                }
                ticker = yf.Ticker(symbol_map[idx])
                info = ticker.history(period='2d')
                
                if not info.empty:
                    latest = info.iloc[-1]
                    prev = info.iloc[-2] if len(info) > 1 else latest
                    
                    change = latest['Close'] - prev['Close']
                    change_pct = (change / prev['Close']) * 100
                    
                    results.append({
                        "symbol": idx,
                        "price": round(latest['Close'], 2),
                        "change": round(change, 2),
                        "change_percent": round(change_pct, 2),
                        "high": round(latest['High'], 2),
                        "low": round(latest['Low'], 2)
                    })
            except Exception as e:
                print(f"Error fetching index {idx}: {e}")
        
        return results

market_data = MarketDataFetcher()