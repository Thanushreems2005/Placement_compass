import asyncio
import os
import sys

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from LANGGRAPH.config.settings import settings
from LANGGRAPH.services.supabase_service import SupabaseClient
from LANGGRAPH.nodes.phase2_research import SECTION_SCHEMA_MAP

async def main():
    db = SupabaseClient()
    record = db.get_company_intelligence("Microsoft Corporation")
    if not record:
        print("No Microsoft Corporation record found.")
        return
        
    db_keys = set(record.keys())
    schema_keys = set()
    for section_name, schema_cls in SECTION_SCHEMA_MAP.items():
        for field in schema_cls.model_fields.keys():
            schema_keys.add(field)
            
    print(f"Total schema fields: {len(schema_keys)}")
    print(f"Total Supabase record fields: {len(db_keys)}")
    
    missing_in_db = schema_keys - db_keys
    print(f"\nSchema fields missing in Supabase: {len(missing_in_db)}")
    if missing_in_db:
        print(sorted(list(missing_in_db)))
        
    missing_in_schema = db_keys - schema_keys - {"provenance", "company_id", "updated_at"}
    print(f"\nSupabase fields missing in Schema: {len(missing_in_schema)}")
    if missing_in_schema:
        print(sorted(list(missing_in_schema)))

if __name__ == "__main__":
    asyncio.run(main())
