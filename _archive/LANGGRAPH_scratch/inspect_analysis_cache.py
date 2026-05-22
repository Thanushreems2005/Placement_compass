import asyncio
import logging
from LANGGRAPH.services.supabase_service import SupabaseClient
from LANGGRAPH.config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test():
    db = SupabaseClient()
    logger.info("Fetching company intelligence...")
    intel = db.get_company_intelligence("Adobe Inc.")
    if intel:
        logger.info("Found company intelligence!")
        logger.info(f"Keys present: {list(intel.keys())}")
        logger.info(f"analysis_json present: {'analysis_json' in intel}")
        logger.info(f"analysis_json value: {intel.get('analysis_json') is not None}")
        if intel.get("analysis_json"):
            logger.info(f"analysis_json keys: {list(intel.get('analysis_json').keys())}")
    else:
        logger.info("Company not found.")

asyncio.run(test())
