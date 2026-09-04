import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from typing import Tuple, Optional
from backend.config.settings import settings

class LSTMPredictor(nn.Module):
    def __init__(self, input_size=5, hidden_size=50, num_layers=2, output_size=1, dropout=0.2):
        super(LSTMPredictor, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        predictions = self.fc(lstm_out[:, -1, :])
        return predictions

class LSTMInference:
    def __init__(self, model_path: Optional[str] = None):
        self.model = LSTMPredictor()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        if model_path and settings.LSTM_MODEL_PATH.exists():
            try:
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                self.model.eval()
            except Exception as e:
                print(f"Could not load LSTM model: {e}")
        
        self.model.to(self.device)
    
    def preprocess_data(self, df: pd.DataFrame, sequence_length: int = 60) -> Tuple[np.ndarray, np.ndarray]:
        """
        Preprocess data for LSTM
        Returns: (X, y) where X is sequences and y is targets
        """
        # Use OHLCV data
        features = ['open', 'high', 'low', 'close', 'volume']
        data = df[features].values
        
        # Normalize
        data_mean = data.mean(axis=0)
        data_std = data.std(axis=0)
        data_normalized = (data - data_mean) / (data_std + 1e-8)
        
        # Create sequences
        X, y = [], []
        for i in range(len(data_normalized) - sequence_length):
            X.append(data_normalized[i:i+sequence_length])
            y.append(data[i+sequence_length][3])  # Close price
        
        return np.array(X), np.array(y), data_mean[3], data_std[3]
    
    def predict_next(self, df: pd.DataFrame, steps: int = 1) -> dict:
        """
        Predict next N steps
        """
        try:
            X, _, mean_close, std_close = self.preprocess_data(df)
            
            if len(X) == 0:
                return {"error": "Insufficient data for prediction"}
            
            # Take last sequence
            last_sequence = torch.FloatTensor(X[-1:]).to(self.device)
            
            with torch.no_grad():
                prediction = self.model(last_sequence)
                predicted_price = prediction.item() * std_close + mean_close
            
            current_price = df['close'].iloc[-1]
            trend = "UP" if predicted_price > current_price else "DOWN"
            confidence = min(abs((predicted_price - current_price) / current_price) * 100, 100) / 100
            
            return {
                "predicted_price": round(predicted_price, 2),
                "current_price": round(current_price, 2),
                "trend": trend,
                "confidence": round(confidence, 2)
            }
        except Exception as e:
            print(f"LSTM prediction error: {e}")
            return {"error": str(e)}

lstm_inference = LSTMInference()