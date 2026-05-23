import logging
import hashlib
from typing import Dict, Any
from LANGGRAPH.services.mission_llm_service import mission_llm_service
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)

async def analyze_mission_node(title: str, body: str) -> Dict[str, Any]:
    """
    Node for analyzing GitHub mission difficulty using LLMs.
    Includes caching to prevent redundant LLM calls for the same issue.
    """
    # Create cache key based on title and body hash
    content_hash = hashlib.md5(f"{title}:{body}".encode('utf-8')).hexdigest()
    cache_key = f"mission_analysis:{content_hash}"

    # Try cache
    cached_analysis = await redis_service.get(cache_key)
    if cached_analysis:
        logger.info("Mission analysis cache hit")
        return cached_analysis

    logger.info("Mission analysis cache miss. Calling LLM.")
    # Run analysis
    analysis = await mission_llm_service.analyze_mission(title, body)

    # Set cache for 24 hours
    if analysis and "Unknown" not in (analysis.get("time_estimate") or ""):
        await redis_service.set(cache_key, analysis, ttl=86400)

    return analysis
