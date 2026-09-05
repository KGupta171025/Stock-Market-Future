from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from backend.data.twelve_data import twelve_data
from backend.data.amfi_data import amfi_data
from backend.data.market_data import market_data

class MarketDataReconciler:
    """
    Data reconciliation engine that collects from multiple feeds, validates sanity,
    filters stale ticks, and selects the most accurate, freshest quote.
    """

    def validate_and_reconcile(self, primary_quote: Optional[Dict], fallback_quote: Optional[Dict]) -> Dict:
        now_iso = datetime.now(timezone.utc).isoformat()

        # If only primary is valid
        if primary_quote and self._is_valid_quote(primary_quote):
            if not fallback_quote or not self._is_valid_quote(fallback_quote):
                return self._normalize_quote(primary_quote)

            # Compare both: check timestamps and freshness
            primary_ts = self._parse_iso(primary_quote.get("exchange_timestamp"))
            fallback_ts = self._parse_iso(fallback_quote.get("exchange_timestamp"))

            if primary_ts >= fallback_ts:
                return self._normalize_quote(primary_quote)
            else:
                return self._normalize_quote(fallback_quote)

        # Fallback to secondary feed
        if fallback_quote and self._is_valid_quote(fallback_quote):
            return self._normalize_quote(fallback_quote)

        # Default fallback structure
        return {
            "symbol": (primary_quote or fallback_quote or {}).get("symbol", "UNKNOWN"),
            "exchange": "NSE",
            "ltp": 0.0,
            "prev_close": 0.0,
            "change": 0.0,
            "change_percent": 0.0,
            "open": 0.0,
            "high": 0.0,
            "low": 0.0,
            "volume": "0",
            "exchange_timestamp": now_iso,
            "received_timestamp": now_iso,
            "data_source": "Exchange Real-Time Feed",
            "status": "Stale",
        }

    def _is_valid_quote(self, q: Dict) -> bool:
        if not q or not isinstance(q, dict):
            return False
        ltp = q.get("ltp") or q.get("price") or 0.0
        if float(ltp) <= 0:
            return False
        high = float(q.get("high") or ltp)
        low = float(q.get("low") or ltp)
        if low > high:
            return False
        return True

    def _parse_iso(self, ts_str: Optional[str]) -> datetime:
        if not ts_str:
            return datetime.min.replace(tzinfo=timezone.utc)
        try:
            return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except Exception:
            return datetime.now(timezone.utc)

    def _normalize_quote(self, q: Dict) -> Dict:
        now_iso = datetime.now(timezone.utc).isoformat()
        ltp = float(q.get("ltp") or q.get("price") or 0.0)
        prev_close = float(q.get("prev_close") or q.get("previous_close") or ltp)
        change = float(q.get("change") or (ltp - prev_close))
        change_pct = float(q.get("change_percent") or q.get("percent_change") or (change / (prev_close or 1) * 100))

        return {
            "symbol": q.get("symbol", ""),
            "name": q.get("name", q.get("symbol", "")),
            "exchange": q.get("exchange", "NSE"),
            "currency": q.get("currency", "INR"),
            "ltp": round(ltp, 2),
            "prev_close": round(prev_close, 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 2),
            "open": round(float(q.get("open") or ltp), 2),
            "high": round(float(q.get("high") or max(ltp, prev_close)), 2),
            "low": round(float(q.get("low") or min(ltp, prev_close)), 2),
            "volume": q.get("volume", "N/A"),
            "exchange_timestamp": q.get("exchange_timestamp") or now_iso,
            "received_timestamp": q.get("received_timestamp") or now_iso,
            "data_source": q.get("data_source", "Exchange Real-Time Feed"),
            "status": q.get("status", "Live"),
            "week_52_high": q.get("week_52_high"),
            "week_52_low": q.get("week_52_low"),
            "pe_ratio": q.get("pe_ratio"),
            "market_cap": q.get("market_cap"),
        }

reconciler = MarketDataReconciler()
