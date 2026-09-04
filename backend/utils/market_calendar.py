from datetime import datetime, timedelta
import pytz
import holidays
from backend.config.settings import settings

class MarketCalendar:
    def __init__(self, exchange='NSE'):
        self.exchange = exchange
        self.timezone = pytz.timezone(settings.NSE_TIMEZONE)
        self.holidays = holidays.India()
    
    def is_market_open(self, dt=None):
        if dt is None:
            dt = datetime.now(self.timezone)
        
        # Check if weekend
        if dt.weekday() >= 5:  # Saturday or Sunday
            return False
        
        # Check if holiday
        if dt.date() in self.holidays:
            return False
        
        # Check market hours
        market_open = dt.replace(hour=settings.NSE_OPEN_HOUR, minute=settings.NSE_OPEN_MINUTE, second=0, microsecond=0)
        market_close = dt.replace(hour=settings.NSE_CLOSE_HOUR, minute=settings.NSE_CLOSE_MINUTE, second=0, microsecond=0)
        
        return market_open <= dt <= market_close
    
    def get_next_market_open(self, dt=None):
        if dt is None:
            dt = datetime.now(self.timezone)
        
        next_day = dt + timedelta(days=1)
        
        # Find next weekday that's not a holiday
        while next_day.weekday() >= 5 or next_day.date() in self.holidays:
            next_day += timedelta(days=1)
        
        return next_day.replace(hour=settings.NSE_OPEN_HOUR, minute=settings.NSE_OPEN_MINUTE, second=0, microsecond=0)
    
    def get_next_market_close(self, dt=None):
        if dt is None:
            dt = datetime.now(self.timezone)
        
        if self.is_market_open(dt):
            return dt.replace(hour=settings.NSE_CLOSE_HOUR, minute=settings.NSE_CLOSE_MINUTE, second=0, microsecond=0)
        else:
            next_open = self.get_next_market_open(dt)
            return next_open.replace(hour=settings.NSE_CLOSE_HOUR, minute=settings.NSE_CLOSE_MINUTE)
    
    def get_market_status(self):
        now = datetime.now(self.timezone)
        is_open = self.is_market_open(now)
        
        return {
            "exchange": self.exchange,
            "is_open": is_open,
            "current_time": now.isoformat(),
            "next_open": self.get_next_market_open(now).isoformat() if not is_open else None,
            "next_close": self.get_next_market_close(now).isoformat() if is_open else None
        }

market_calendar = MarketCalendar()