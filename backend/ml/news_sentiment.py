from textblob import TextBlob
import requests
from typing import List, Dict
import random

class NewsSentimentAnalyzer:
    def __init__(self):
        pass
    
    def analyze_sentiment(self, text: str) -> float:
        """
        Analyze sentiment of text
        Returns: polarity score between -1 (negative) and 1 (positive)
        """
        try:
            blob = TextBlob(text)
            return blob.sentiment.polarity
        except:
            return 0.0
    
    def get_stock_news(self, symbol: str) -> List[Dict]:
        """
        Get news for a stock (mock data for MVP)
        """
        # Mock news for demonstration
        mock_news = [
            {
                "title": f"{symbol} reports strong quarterly earnings",
                "sentiment": 0.7,
                "source": "Economic Times",
                "timestamp": "2 hours ago"
            },
            {
                "title": f"Analysts upgrade {symbol} to 'Buy' rating",
                "sentiment": 0.5,
                "source": "Moneycontrol",
                "timestamp": "5 hours ago"
            },
            {
                "title": f"{symbol} announces new product launch",
                "sentiment": 0.3,
                "source": "Business Standard",
                "timestamp": "1 day ago"
            }
        ]
        
        return mock_news
    
    def aggregate_sentiment(self, symbol: str) -> Dict:
        """
        Get aggregate sentiment for stock
        """
        news = self.get_stock_news(symbol)
        
        if not news:
            return {"overall_sentiment": 0.0, "sentiment_label": "Neutral"}
        
        avg_sentiment = sum(item['sentiment'] for item in news) / len(news)
        
        if avg_sentiment > 0.3:
            label = "Positive"
        elif avg_sentiment < -0.3:
            label = "Negative"
        else:
            label = "Neutral"
        
        return {
            "overall_sentiment": round(avg_sentiment, 2),
            "sentiment_label": label,
            "news_count": len(news)
        }

news_analyzer = NewsSentimentAnalyzer()