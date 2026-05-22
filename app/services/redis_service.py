import logging
import json
import redis.asyncio as aioredis
from typing import Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisService:
    _instance = None
    _client: Optional[aioredis.Redis] = None
    _is_active: bool = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(RedisService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        # Prevent re-initialization if already done
        if self._client is not None:
            return
        
        host = settings.REDIS_HOST
        port = settings.REDIS_PORT
        logger.info(f"Initializing Redis client at {host}:{port}")
        
        try:
            self._client = aioredis.Redis(
                host=host,
                port=port,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=2.0,
                retry_on_timeout=True
            )
            # Active status will be verified dynamically
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {e}")
            self._client = None
            self._is_active = False

    async def ping(self) -> bool:
        """Asynchronously ping Redis to verify connectivity."""
        if not self._client:
            self._is_active = False
            return False
        try:
            await self._client.ping()
            self._is_active = True
            return True
        except Exception as e:
            logger.warning(f"Redis ping failed: {e}")
            self._is_active = False
            return False

    @property
    def is_active(self) -> bool:
        return self._is_active

    async def get(self, key: str) -> Optional[Any]:
        """Safely fetch a key, returning parsed JSON or string, or None on miss/failure."""
        if not self._client or not self._is_active:
            return None
        try:
            data = await self._client.get(key)
            if data is None:
                return None
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return data
        except Exception as e:
            logger.warning(f"Redis get failed for key {key}: {e}. Marking Redis as inactive.")
            self._is_active = False
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Safely set a key with optional TTL."""
        if not self._client or not self._is_active:
            return False
        try:
            serialized = json.dumps(value, ensure_ascii=False) if not isinstance(value, (str, int, float)) else str(value)
            expire_ttl = ttl if ttl is not None else settings.REDIS_TTL
            await self._client.set(key, serialized, ex=expire_ttl)
            return True
        except Exception as e:
            logger.warning(f"Redis set failed for key {key}: {e}. Marking Redis as inactive.")
            self._is_active = False
            return False

    async def delete(self, key: str) -> bool:
        """Safely delete a key."""
        if not self._client or not self._is_active:
            return False
        try:
            await self._client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Redis delete failed for key {key}: {e}. Marking Redis as inactive.")
            self._is_active = False
            return False

    async def incr(self, key: str) -> Optional[int]:
        """Safely increment a key (useful for telemetry)."""
        if not self._client or not self._is_active:
            return None
        try:
            return await self._client.incr(key)
        except Exception as e:
            logger.warning(f"Redis incr failed for key {key}: {e}. Marking Redis as inactive.")
            self._is_active = False
            return None

    async def lpush(self, key: str, value: Any) -> Optional[int]:
        """Safely left-push a value to a list (useful for telemetry logs)."""
        if not self._client or not self._is_active:
            return None
        try:
            serialized = json.dumps(value, ensure_ascii=False) if not isinstance(value, (str, int, float)) else str(value)
            return await self._client.lpush(key, serialized)
        except Exception as e:
            logger.warning(f"Redis lpush failed for key {key}: {e}. Marking Redis as inactive.")
            self._is_active = False
            return None

    async def close(self):
        """Close Redis client pool."""
        if self._client:
            try:
                await self._client.close()
                logger.info("Closed Redis client pool.")
            except Exception as e:
                logger.error(f"Error closing Redis client: {e}")

redis_service = RedisService()
