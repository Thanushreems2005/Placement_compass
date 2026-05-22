import os
import sys
from supabase import create_client

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from LANGGRAPH.config.settings import settings

def main():
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_ANON_KEY
    supabase = create_client(url, key)
    
    try:
        res = supabase.table("companies").select("*").limit(1).execute()
        print("companies Columns:", sorted(list(res.data[0].keys())))
        print("Sample data:", res.data[0])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
