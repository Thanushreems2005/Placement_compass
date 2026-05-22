import asyncio
import logging
from LANGGRAPH.services.supabase_service import SupabaseClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test():
    db = SupabaseClient()
    logger.info("Querying staging_company table...")
    res = db.client.table("staging_company").select("*").limit(1).execute()
    if res.data:
        logger.info("Staging company row found!")
        row = res.data[0]
        logger.info(f"Row keys: {list(row.keys())}")
        for k, v in row.items():
            if v is not None:
                logger.info(f"  {k}: {type(v)} (sample: {str(v)[:100]})")
    else:
        logger.info("staging_company is empty.")

asyncio.run(test())
