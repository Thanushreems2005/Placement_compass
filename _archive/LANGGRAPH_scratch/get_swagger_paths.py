import asyncio
import logging
import httpx
from LANGGRAPH.config.settings import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test():
    url = f"{settings.SUPABASE_URL}/rest/v1/"
    headers = {"apikey": settings.SUPABASE_ANON_KEY}
    logger.info(f"Querying Swagger path for {settings.SUPABASE_URL}...")
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        swagger = res.json()
        if "paths" in swagger:
            paths = [p for p in swagger["paths"].keys() if not p.startswith("/rpc/")]
            logger.info(f"All accessible tables: {paths}")
        else:
            logger.info(f"No paths found: {swagger}")

asyncio.run(test())
