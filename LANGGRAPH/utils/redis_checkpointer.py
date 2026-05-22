import logging
import pickle
from typing import Any, Dict, Iterator, Optional, AsyncIterator
from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import Checkpoint, CheckpointMetadata, CheckpointTuple, ChannelVersions
from langgraph.checkpoint.memory import MemorySaver

logger = logging.getLogger(__name__)

class SafeRedisSaver(MemorySaver):
    """
    Enterprise-grade safe checkpointer for LangGraph that replicates checkpoint states into Redis.
    Falls back gracefully to standard MemorySaver in-memory checkpointing if Redis is down.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._redis_active = False
        self._init_redis()

    def _init_redis(self):
        try:
            from app.services.redis_service import redis_service
            self._redis_active = redis_service.is_active
        except Exception:
            self._redis_active = False

    def _get_redis_key(self, config: RunnableConfig) -> str:
        configurable = config.get("configurable", {})
        thread_id = configurable.get("thread_id", "default")
        checkpoint_ns = configurable.get("checkpoint_ns", "")
        return f"graph_checkpoint:{thread_id}:{checkpoint_ns}"

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        # 1. Store in standard MemorySaver (in-memory)
        res_config = super().put(config, checkpoint, metadata, new_versions)

        # 2. Replicate to Redis
        try:
            from app.services.redis_service import redis_service
            if redis_service.is_active:
                key = self._get_redis_key(config)
                # Serialize using pickle for binary safety of LangGraph states
                data = {
                    "checkpoint": checkpoint,
                    "metadata": metadata,
                    "new_versions": new_versions,
                    "config": config
                }
                serialized = pickle.dumps(data)
                
                # Run Redis set synchronously via thread-safe bridge
                from LANGGRAPH.services.field_cache import run_async_sync
                run_async_sync(redis_service.set(key, serialized.hex()))
        except Exception as e:
            logger.warning(f"[SafeRedisSaver] Failed to replicate checkpoint to Redis: {e}")

        return res_config

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        # 1. Store in MemorySaver
        res_config = await super().aput(config, checkpoint, metadata, new_versions)

        # 2. Replicate to Redis
        try:
            from app.services.redis_service import redis_service
            if redis_service.is_active:
                key = self._get_redis_key(config)
                data = {
                    "checkpoint": checkpoint,
                    "metadata": metadata,
                    "new_versions": new_versions,
                    "config": config
                }
                serialized = pickle.dumps(data)
                await redis_service.set(key, serialized.hex())
        except Exception as e:
            logger.warning(f"[SafeRedisSaver] Async replica failed: {e}")

        return res_config

    def get_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        # 1. Try reading from standard MemorySaver (in-memory)
        res = super().get_tuple(config)
        if res:
            return res

        # 2. If memory miss, pull from Redis
        try:
            from app.services.redis_service import redis_service
            if redis_service.is_active:
                key = self._get_redis_key(config)
                from LANGGRAPH.services.field_cache import run_async_sync
                hex_data = run_async_sync(redis_service.get(key))
                
                if hex_data:
                    data = pickle.loads(bytes.fromhex(hex_data))
                    # Hydrate MemorySaver with this pulled checkpoint so subsequent operations hit memory
                    super().put(data["config"], data["checkpoint"], data["metadata"], data["new_versions"])
                    return super().get_tuple(config)
        except Exception as e:
            logger.warning(f"[SafeRedisSaver] Failed to retrieve checkpoint from Redis: {e}")

        return None

    async def aget_tuple(self, config: RunnableConfig) -> Optional[CheckpointTuple]:
        # 1. Try MemorySaver
        res = await super().aget_tuple(config)
        if res:
            return res

        # 2. Pull from Redis
        try:
            from app.services.redis_service import redis_service
            if redis_service.is_active:
                key = self._get_redis_key(config)
                hex_data = await redis_service.get(key)
                if hex_data:
                    data = pickle.loads(bytes.fromhex(hex_data))
                    await super().aput(data["config"], data["checkpoint"], data["metadata"], data["new_versions"])
                    return await super().aget_tuple(config)
        except Exception as e:
            logger.warning(f"[SafeRedisSaver] Async get failed: {e}")

        return None
