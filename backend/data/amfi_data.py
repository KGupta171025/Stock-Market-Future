import requests
import pandas as pd
from typing import List, Dict, Optional

class AMFIDataFetcher:
    def __init__(self):
        self.amfi_url = "https://www.amfiindia.com/spages/NAVAll.txt"
    
    def fetch_mutual_funds(self) -> List[Dict]:
        """
        Fetch mutual funds NAV data from AMFI
        """
        try:
            response = requests.get(self.amfi_url, timeout=10)
            response.raise_for_status()
            
            lines = response.text.split('\n')
            funds = []
            current_category = ""
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Category headers don't have semicolons
                if ';' not in line:
                    current_category = line
                    continue
                
                parts = line.split(';')
                if len(parts) >= 6:
                    try:
                        funds.append({
                            "scheme_code": parts[0],
                            "scheme_name": parts[3],
                            "nav": float(parts[4]) if parts[4] else 0.0,
                            "date": parts[5],
                            "category": current_category
                        })
                    except (ValueError, IndexError):
                        continue
            
            return funds[:100]  # Return top 100 for performance
        
        except Exception as e:
            print(f"Error fetching AMFI data: {e}")
            return []
    
    def search_mutual_fund(self, query: str) -> List[Dict]:
        """
        Search mutual funds by name
        """
        all_funds = self.fetch_mutual_funds()
        query_lower = query.lower()
        return [f for f in all_funds if query_lower in f['scheme_name'].lower()][:20]

amfi_data = AMFIDataFetcher()