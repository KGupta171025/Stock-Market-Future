import requests
import time
from typing import Optional, Dict, List, Any
import pandas as pd
from datetime import datetime, timezone
from backend.config.settings import settings

class TwelveDataService:
    def __init__(self):
        self.api_key = settings.TWELVE_DATA_API_KEY
        self.base_url = settings.TWELVE_DATA_BASE_URL
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 3  # 3 seconds cache TTL to prevent rate limit exhaustion while maintaining real-time freshness

    def get_quote(self, symbol: str, exchange: Optional[str] = None) -> Optional[Dict]:
        """
        Fetch normalized real-time quote for a symbol.
        """
        cache_key = f"quote_{symbol}_{exchange or ''}"
        now = time.time()

        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if now - cached["timestamp"] < self._cache_ttl:
                return cached["data"]

        params = {
            "symbol": symbol,
            "apikey": self.api_key
        }
        if exchange:
            params["exchange"] = exchange

        try:
            url = f"{self.base_url}/quote"
            res = requests.get(url, params=params, timeout=6)
            if res.status_code == 200:
                data = res.json()
                if "symbol" in data and "close" in data:
                    ltp = float(data.get("close") or data.get("previous_close") or 0.0)
                    prev_close = float(data.get("previous_close") or ltp)
                    change = float(data.get("change") or (ltp - prev_close))
                    percent_change = float(data.get("percent_change") or (change / (prev_close or 1) * 100))

                    open_p = float(data.get("open") or ltp)
                    high_p = float(data.get("high") or max(open_p, ltp))
                    low_p = float(data.get("low") or min(open_p, ltp))
                    volume = data.get("volume") or "N/A"

                    # Check market status from feed
                    is_market_open = data.get("is_market_open", True)
                    feed_status = "Live" if is_market_open else "Market Closed"

                    received_time = datetime.now(timezone.utc).isoformat()
                    exchange_time = data.get("datetime") or received_time

                    normalized = {
                        "symbol": data.get("symbol", symbol),
                        "name": data.get("name", symbol),
                        "exchange": data.get("exchange", exchange or "NASDAQ"),
                        "currency": data.get("currency", "USD"),
                        "ltp": ltp,
                        "prev_close": prev_close,
                        "change": round(change, 2),
                        "change_percent": round(percent_change, 2),
                        "open": round(open_p, 2),
                        "high": round(high_p, 2),
                        "low": round(low_p, 2),
                        "volume": volume,
                        "exchange_timestamp": exchange_time,
                        "received_timestamp": received_time,
                        "data_source": "Global Exchange Feed",
                        "status": feed_status,
                        "week_52_high": float(data.get("fifty_two_week", {}).get("high", high_p * 1.2) if isinstance(data.get("fifty_two_week"), dict) else high_p * 1.2),
                        "week_52_low": float(data.get("fifty_two_week", {}).get("low", low_p * 0.8) if isinstance(data.get("fifty_two_week"), dict) else low_p * 0.8),
                    }

                    self._cache[cache_key] = {"timestamp": now, "data": normalized}
                    return normalized

        except Exception as e:
            print(f"[TwelveData] Error fetching quote for {symbol}: {e}")

        return None

    def get_time_series(self, symbol: str, interval: str = '1day', outputsize: int = 100, exchange: Optional[str] = None) -> Optional[pd.DataFrame]:
        """
        Fetch historical candlestick time series data.
        """
        cache_key = f"series_{symbol}_{interval}_{outputsize}_{exchange or ''}"
        now = time.time()

        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if now - cached["timestamp"] < 30:  # 30s cache for historical series
                return cached["data"]

        params = {
            "symbol": symbol,
            "interval": interval,
            "outputsize": outputsize,
            "format": "json",
            "apikey": self.api_key
        }
        if exchange:
            params["exchange"] = exchange

        try:
            url = f"{self.base_url}/time_series"
            res = requests.get(url, params=params, timeout=8)
            if res.status_code == 200:
                data = res.json()
                if "values" in data:
                    df = pd.DataFrame(data["values"])
                    df["datetime"] = pd.to_datetime(df["datetime"])
                    df = df.sort_values("datetime")
                    for col in ["open", "high", "low", "close", "volume"]:
                        if col in df.columns:
                            df[col] = pd.to_numeric(df[col], errors="coerce")
                    
                    self._cache[cache_key] = {"timestamp": now, "data": df}
                    return df

        except Exception as e:
            print(f"[TwelveData] Error fetching time series for {symbol}: {e}")

        return None

twelve_data = TwelveDataService()
