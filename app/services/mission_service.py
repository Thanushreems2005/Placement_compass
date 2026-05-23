import logging
from typing import List
from app.services.github_service import github_service
from app.services.redis_service import redis_service
from app.models.missions import MissionsResponse, MissionCard

logger = logging.getLogger(__name__)

class MissionService:
    CACHE_TTL = 3600  # 1 hour cache

    async def get_default_missions(self) -> MissionsResponse:
        cache_key = "missions:default:v3"
        
        cached_data = await redis_service.get(cache_key)
        if cached_data:
            try:
                missions = [MissionCard(**item) for item in cached_data.get("missions", [])]
                return MissionsResponse(
                    missions=missions, 
                    cached=True, 
                    source="redis",
                    total_count=len(missions),
                    rate_limited=cached_data.get("rate_limited", False)
                )
            except Exception as e:
                logger.error(f"Error parsing cached default missions: {e}")

        missions, rate_limited = await github_service.fetch_default_missions()
        
        if missions:
            missions_dict = [m.model_dump() for m in missions]
            await redis_service.set(cache_key, {"missions": missions_dict, "rate_limited": rate_limited}, ttl=self.CACHE_TTL)
            
        return MissionsResponse(
            missions=missions, 
            cached=False, 
            source="github", 
            total_count=len(missions),
            rate_limited=rate_limited
        )

    async def get_general_missions(self) -> MissionsResponse:
        # Fallback to default if general is called
        return await self.get_default_missions()

    async def get_company_missions(self, company: str) -> MissionsResponse:
        cache_key = f"missions:company:v3:{company.lower().replace(' ', '_')}"

        cached_data = await redis_service.get(cache_key)
        if cached_data:
            try:
                missions = [MissionCard(**item) for item in cached_data.get("missions", [])]
                return MissionsResponse(
                    missions=missions, 
                    cached=True, 
                    source="redis",
                    total_count=len(missions),
                    rate_limited=cached_data.get("rate_limited", False)
                )
            except Exception as e:
                logger.error(f"Error parsing cached missions for {company}: {e}")

        missions, rate_limited = await github_service.fetch_company_issues(company)
        
        if missions:
            missions_dict = [m.model_dump() for m in missions]
            await redis_service.set(cache_key, {"missions": missions_dict, "rate_limited": rate_limited}, ttl=self.CACHE_TTL)
            
        return MissionsResponse(
            missions=missions, 
            cached=False, 
            source="github",
            total_count=len(missions),
            rate_limited=rate_limited
        )

mission_service = MissionService()
