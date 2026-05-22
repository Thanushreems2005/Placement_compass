import asyncio
import logging
import httpx
from postgrest import APIError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test():
    # Let's query staging_company using postgrest directly via HTTP request
    url = "https://hkwessehtaonqaakzyvj.supabase.co/rest/v1/staging_company"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrd2Vzc2VodGFvbnFhYWt6eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTEwMzksImV4cCI6MjA5MTg4NzAzOX0.4w-K12jyYlGT3dDXNa6ypRyhzheM2FkG5VLmmeB7GN8"
    }
    
    logger.info("Fetching first row from staging_company on secondary DB...")
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{url}?select=*&limit=1", headers=headers)
        if res.status_code == 200:
            data = res.json()
            if data:
                logger.info("Found data!")
                logger.info(f"Row keys: {list(data[0].keys())}")
                for k, v in data[0].items():
                    if v is not None:
                        logger.info(f"  {k}: {v}")
            else:
                logger.info("staging_company table exists but is empty on secondary DB.")
        else:
            logger.info(f"Query failed with status {res.status_code}: {res.text}")

asyncio.run(test())
