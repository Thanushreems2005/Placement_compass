import asyncio
import json
import os
import sys

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import settings first to load .env variables
from LANGGRAPH.config.settings import settings
from LANGGRAPH.services.supabase_service import SupabaseClient

async def main():
    company_name = "Microsoft Corporation"
    print(f"Connecting to Supabase to fetch all parameters for '{company_name}'...")
    
    db = SupabaseClient()
    record = db.get_company_intelligence(company_name)
    
    if not record:
        print(f"Error: No intelligence record found in Supabase for '{company_name}'")
        return
        
    print(f"\nSuccessfully fetched flat record with {len(record)} keys!")
    print(json.dumps(record, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
