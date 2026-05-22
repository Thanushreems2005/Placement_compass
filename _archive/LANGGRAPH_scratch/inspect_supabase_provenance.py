import asyncio
import json
import os
import sys

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from LANGGRAPH.config.settings import settings
from LANGGRAPH.services.supabase_service import SupabaseClient

async def main():
    db = SupabaseClient()
    record = db.get_company_intelligence("Microsoft Corporation")
    if record:
        prov = record.get("provenance")
        print(f"Type of provenance: {type(prov)}")
        if isinstance(prov, dict):
            print(f"Number of keys in provenance: {len(prov)}")
            # Print first 5 keys
            first_5 = list(prov.keys())[:5]
            print("First 5 keys:")
            for k in first_5:
                print(f"  {k}: {prov[k]}")
        else:
            print(f"Provenance value: {prov}")
    else:
        print("No record found.")

if __name__ == "__main__":
    asyncio.run(main())
