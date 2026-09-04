import firebase_admin
from firebase_admin import credentials, auth
from backend.config.settings import settings
import os

_firebase_app = None

def initialize_firebase():
    global _firebase_app
    if _firebase_app is None:
        try:
            cred_path = settings.FIREBASE_CREDENTIALS_PATH
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                _firebase_app = firebase_admin.initialize_app(cred)
            else:
                print(f"Warning: Firebase credentials not found at {cred_path}")
        except Exception as e:
            print(f"Firebase initialization error: {e}")
    return _firebase_app

def verify_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None