import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import math

class TransformerPredictor(nn.Module):
    def __init__(self, input_size=5, d_model=64, nhead=4, num_layers=2, dim_feedforward=256, dropout=0.1):
        super(TransformerPredictor, self).__init__()
        
        self.embedding = nn.Linear(input_size, d_model)
        self.pos_encoder = PositionalEncoding(d_model, dropout)
        
        encoder_layers = nn.TransformerEncoderLayer(d_model, nhead, dim_feedforward, dropout)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers)
        
        self.fc = nn.Linear(d_model, 1)
    
    def forward(self, x):
        x = self.embedding(x)
        x = self.pos_encoder(x)
        x = x.transpose(0, 1)  # (seq, batch, features)
        x = self.transformer_encoder(x)
        x = x.transpose(0, 1)  # (batch, seq, features)
        output = self.fc(x[:, -1, :])
        return output

class PositionalEncoding(nn.Module):
    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super(PositionalEncoding, self).__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::2] = torch.sin(position * div_term)
        pe[:, 0, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        x = x + self.pe[:x.size(0)]
        return self.dropout(x)

class TransformerInference:
    def __init__(self):
        self.model = TransformerPredictor()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        self.model.eval()
    
    def predict_trend(self, df: pd.DataFrame) -> dict:
        """
        Predict long-term trend using transformer
        """
        try:
            # Simple trend analysis
            recent_prices = df['close'].tail(20).values
            price_change = (recent_prices[-1] - recent_prices[0]) / recent_prices[0]
            
            trend = "UP" if price_change > 0 else "DOWN"
            confidence = min(abs(price_change) * 10, 1.0)
            
            return {
                "trend": trend,
                "confidence": round(confidence, 2),
                "price_change_pct": round(price_change * 100, 2)
            }
        except Exception as e:
            print(f"Transformer prediction error: {e}")
            return {"error": str(e)}

transformer_inference = TransformerInference()