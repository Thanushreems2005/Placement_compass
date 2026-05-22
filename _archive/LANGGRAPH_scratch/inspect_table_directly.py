import asyncio
import logging
from LANGGRAPH.services.supabase_service import SupabaseClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test():
    db = SupabaseClient()
    logger.info("Querying companies table...")
    res = db.client.table("companies").select("company_id, name").eq("name", "Adobe Inc.").execute()
    logger.info(f"Companies: {res.data}")
    if res.data:
        comp_id = res.data[0]["company_id"]
        logger.info(f"Querying company_json directly for company_id {comp_id}...")
        res2 = db.client.table("company_json").select("full_json").eq("company_id", comp_id).execute()
        if res2.data:
            full = res2.data[0].get("full_json") or {}
            logger.info(f"full_json keys: {list(full.keys())}")
            logger.info(f"analysis_json in full_json: {'analysis_json' in full}")
            logger.info(f"analysis_json value type: {type(full.get('analysis_json'))}")
        else:
            logger.info("company_json row not found.")
        
        logger.info("Querying historical_company_analysis directly...")
        res3 = db.client.table("historical_company_analysis").select("*").eq("company_id", comp_id).execute()
        logger.info(f"historical_company_analysis rows: {len(res3.data) if res3.data else 0}")
        if res3.data:
            logger.info(f"Latest historical row keys: {list(res3.data[0].keys())}")
            logger.info(f"Latest historical row analysis_json: {res3.data[0].get('analysis_json') is not None}")

asyncio.run(test())
