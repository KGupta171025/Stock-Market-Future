import os
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent

class Settings:
    # MongoDB
    MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    DB_NAME = os.environ.get('DB_NAME', 'test_database')
    
    # RapidAPI
    RAPIDAPI_KEY = os.environ.get('RAPIDAPI_KEY', '')
    RAPIDAPI_HOST = "twelve-data1.p.rapidapi.com"
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH = os.environ.get('FIREBASE_CREDENTIALS_PATH', '/app/backend/secrets/firebase-adminsdk.json')
    
    # Market Hours (NSE)
    NSE_OPEN_HOUR = 9
    NSE_OPEN_MINUTE = 15
    NSE_CLOSE_HOUR = 15
    NSE_CLOSE_MINUTE = 30
    NSE_TIMEZONE = 'Asia/Kolkata'
    
    # Model Paths
    MODELS_DIR = ROOT_DIR / 'models'
    LSTM_MODEL_PATH = MODELS_DIR / 'lstm_model.pt'
    TRANSFORMER_MODEL_PATH = MODELS_DIR / 'transformer_model.pt'
    
    # Currency
    DEFAULT_CURRENCY = 'INR'
    
settings = Settings()