import httpx
import logging
import asyncio
from typing import Dict, Any, List, Optional, Union
from app.core.config import settings

logger = logging.getLogger("app.core.supabase")

class SupabaseClient:
    """
    Production-grade Async Supabase REST Client with connection pooling,
    retry logic, error handling, and a clean query abstraction layer.
    """
    def __init__(self):
        self.url = settings.SUPABASE_URL.rstrip('/')
        self.key = settings.SUPABASE_ANON_KEY
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        # Connection pooling via httpx.AsyncClient
        self.client = httpx.AsyncClient(
            base_url=f"{self.url}/rest/v1",
            headers=self.headers,
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50)
        )

    async def close(self):
        await self.client.aclose()

    async def _request(
        self, 
        method: str, 
        path: str, 
        json_data: Optional[Any] = None, 
        params: Optional[Dict[str, Any]] = None,
        custom_headers: Optional[Dict[str, str]] = None,
        retries: int = 3,
        backoff_factor: float = 0.5
    ) -> Any:
        headers = {**self.headers, **(custom_headers or {})}
        
        for attempt in range(retries):
            try:
                response = await self.client.request(
                    method=method,
                    url=path,
                    json=json_data,
                    params=params,
                    headers=headers
                )
                
                # Check for standard HTTP errors
                response.raise_for_status()
                
                # Supabase empty responses (e.g. DELETE or empty return)
                if response.status_code == 204 or not response.content:
                    return []
                
                return response.json()
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Supabase HTTP error {e.response.status_code} on {method} {path}: {e.response.text}")
                # Don't retry on client errors (4xx) except possibly rate limits (429)
                if e.response.status_code == 429 or e.response.status_code >= 500:
                    if attempt == retries - 1:
                        raise e
                    await asyncio.sleep(backoff_factor * (2 ** attempt))
                else:
                    raise e
            except (httpx.RequestError, asyncio.TimeoutError) as e:
                logger.error(f"Supabase network/timeout error on {method} {path} (Attempt {attempt+1}/{retries}): {str(e)}")
                if attempt == retries - 1:
                    raise e
                await asyncio.sleep(backoff_factor * (2 ** attempt))
        
        raise Exception("Supabase request failed after retries")

    # --- Query Abstraction Layer ---

    async def select(self, table: str, query: str = "*", filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Perform a SELECT query.
        Filters can be a dict: e.g. {"student_id": "eq.123"}
        """
        params = {"select": query}
        if filters:
            for k, v in filters.items():
                params[k] = v
        return await self._request("GET", f"/{table}", params=params)

    async def insert(self, table: str, data: Union[Dict[str, Any], List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """
        Perform an INSERT query.
        """
        return await self._request("POST", f"/{table}", json_data=data)

    async def update(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Perform an UPDATE query.
        """
        params = {}
        for k, v in filters.items():
            params[k] = v
        return await self._request("PATCH", f"/{table}", json_data=data, params=params)

    async def upsert(self, table: str, data: Union[Dict[str, Any], List[Dict[str, Any]]], on_conflict: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Perform an UPSERT query using resolution preferences.
        """
        headers = {"Prefer": "resolution=merge-duplicates,return=representation"}
        if on_conflict:
            headers["Prefer"] = f"resolution=merge-duplicates,on_conflict={on_conflict},return=representation"
        return await self._request("POST", f"/{table}", json_data=data, custom_headers=headers)

    async def delete(self, table: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Perform a DELETE query.
        """
        params = {}
        for k, v in filters.items():
            params[k] = v
        return await self._request("DELETE", f"/{table}", params=params)

# Global singleton client instance
supabase_client = SupabaseClient()
