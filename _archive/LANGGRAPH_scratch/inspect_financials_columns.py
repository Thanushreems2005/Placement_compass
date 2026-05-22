import os
import sys
from supabase import create_client

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from LANGGRAPH.config.settings import settings

def main():
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
    supabase = create_client(url, key)
    
    for t in ["company_financials", "company_culture", "company_logistics"]:
        try:
            res = supabase.table(t).select("*").limit(1).execute()
            print(f"\n--- {t} ---")
            if res.data:
                print("Columns:", sorted(list(res.data[0].keys())))
            else:
                print("Table is empty.")
        except Exception as e:
            print(f"Error for {t}: {e}")

if __name__ == "__main__":
    main()
