import pandas as pd
import numpy as np
from typing import Dict

class TechnicalIndicators:
    @staticmethod
    def calculate_sma(df: pd.DataFrame, period: int = 20, column: str = 'close') -> pd.Series:
        """Simple Moving Average"""
        return df[column].rolling(window=period).mean()
    
    @staticmethod
    def calculate_ema(df: pd.DataFrame, period: int = 20, column: str = 'close') -> pd.Series:
        """Exponential Moving Average"""
        return df[column].ewm(span=period, adjust=False).mean()
    
    @staticmethod
    def calculate_rsi(df: pd.DataFrame, period: int = 14, column: str = 'close') -> pd.Series:
        """Relative Strength Index"""
        delta = df[column].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    @staticmethod
    def calculate_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9, column: str = 'close') -> Dict:
        """MACD Indicator"""
        ema_fast = df[column].ewm(span=fast, adjust=False).mean()
        ema_slow = df[column].ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line,
            'signal': signal_line,
            'histogram': histogram
        }
    
    @staticmethod
    def calculate_bollinger_bands(df: pd.DataFrame, period: int = 20, std_dev: int = 2, column: str = 'close') -> Dict:
        """Bollinger Bands"""
        sma = df[column].rolling(window=period).mean()
        std = df[column].rolling(window=period).std()
        upper_band = sma + (std * std_dev)
        lower_band = sma - (std * std_dev)
        
        return {
            'upper': upper_band,
            'middle': sma,
            'lower': lower_band
        }
    
    @staticmethod
    def calculate_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
        """Calculate all indicators and add to dataframe"""
        result_df = df.copy()
        
        # Moving Averages
        result_df['sma_20'] = TechnicalIndicators.calculate_sma(df, 20)
        result_df['sma_50'] = TechnicalIndicators.calculate_sma(df, 50)
        result_df['ema_20'] = TechnicalIndicators.calculate_ema(df, 20)
        
        # RSI
        result_df['rsi'] = TechnicalIndicators.calculate_rsi(df)
        
        # MACD
        macd = TechnicalIndicators.calculate_macd(df)
        result_df['macd'] = macd['macd']
        result_df['macd_signal'] = macd['signal']
        result_df['macd_histogram'] = macd['histogram']
        
        # Bollinger Bands
        bb = TechnicalIndicators.calculate_bollinger_bands(df)
        result_df['bb_upper'] = bb['upper']
        result_df['bb_middle'] = bb['middle']
        result_df['bb_lower'] = bb['lower']
        
        return result_df

indicators = TechnicalIndicators()