"""
Provider Orchestration Utilities
=================================
Centralised async infrastructure for:
  - Per-provider async semaphores (concurrency control)
  - Staggered provider startup (jitter)
  - Adaptive cooldown registry with TTL tracking
  - Provider health scoring and availability registry
  - Retry-storm prevention via global call rate limiting
"""

import asyncio
import logging
import time
import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Provider Availability States
# ---------------------------------------------------------------------------

class ProviderState(str, Enum):
    HEALTHY      = "healthy"
    RATE_LIMITED = "rate_limited"
    COOLDOWN     = "cooldown"
    EXHAUSTED    = "exhausted"   # daily quota gone
    UNAVAILABLE  = "unavailable" # key missing / endpoint down


@dataclass
class ProviderHealth:
    provider_id: str
    state: ProviderState = ProviderState.HEALTHY
    consecutive_failures: int = 0
    total_calls: int = 0
    successful_calls: int = 0
    total_tokens_used: int = 0
    last_failure_at: float = 0.0
    cooldown_until: float = 0.0     # epoch second
    daily_token_limit: int = 100_000
    daily_tokens_used: int = 0
    daily_reset_at: float = 0.0     # epoch second (midnight UTC)

    # --- derived ---
    @property
    def success_rate(self) -> float:
        return self.successful_calls / self.total_calls if self.total_calls > 0 else 1.0

    @property
    def is_available(self) -> bool:
        return self.state in (ProviderState.HEALTHY,)

    @property
    def in_cooldown(self) -> bool:
        return time.time() < self.cooldown_until

    def tokens_remaining(self) -> int:
        return max(0, self.daily_token_limit - self.daily_tokens_used)


# ---------------------------------------------------------------------------
# Provider Orchestration Registry
# ---------------------------------------------------------------------------

class ProviderOrchestrator:
    """
    Central registry tracking health, concurrency, and scheduling for all
    LLM providers. Acts as the single source of truth for provider state.

    Usage:
        orchestrator = ProviderOrchestrator()
        async with orchestrator.acquire("groq"):
            result = await llm_service.call_llm(...)
    """

    # Max concurrent calls per provider (free-tier safe)
    DEFAULT_CONCURRENCY = {
        "groq":       2,
        "gemini":     2,
        "cerebras":   3,
        "openrouter": 1,
    }

    # Cooldown durations in seconds per failure count tier
    COOLDOWN_TIERS = {
        1: 30,    # first failure  → 30s
        2: 60,    # second failure → 1 min
        3: 90,    # third failure  → 90s (circuit breaker threshold)
        4: 180,   # fourth+        → 3 min
    }

    def __init__(self):
        self._health: Dict[str, ProviderHealth] = {}
        self._semaphores: Dict[str, asyncio.Semaphore] = {}
        self._global_call_times: List[float] = []   # for storm prevention
        self._global_lock = asyncio.Lock()

    # ------------------------------------------------------------------
    # Semaphore Management
    # ------------------------------------------------------------------

    def _get_semaphore(self, provider_id: str) -> asyncio.Semaphore:
        if provider_id not in self._semaphores:
            limit = self.DEFAULT_CONCURRENCY.get(provider_id.lower(), 1)
            self._semaphores[provider_id] = asyncio.Semaphore(limit)
        return self._semaphores[provider_id]

    async def acquire(self, provider_id: str):
        """Async context manager: acquire semaphore and stagger startup."""
        return _SemaphoreContext(self._get_semaphore(provider_id), provider_id)

    # ------------------------------------------------------------------
    # Health Tracking
    # ------------------------------------------------------------------

    def get_health(self, provider_id: str) -> ProviderHealth:
        if provider_id not in self._health:
            self._health[provider_id] = ProviderHealth(provider_id=provider_id)
        return self._health[provider_id]

    def record_success(self, provider_id: str, tokens_used: int = 0):
        h = self.get_health(provider_id)
        h.total_calls += 1
        h.successful_calls += 1
        h.consecutive_failures = 0
        h.total_tokens_used += tokens_used
        h.daily_tokens_used += tokens_used
        if h.state == ProviderState.RATE_LIMITED:
            h.state = ProviderState.HEALTHY   # auto-recover
        logger.debug(f"[ORCHESTRATOR] {provider_id} ✅ success (tokens: {tokens_used})")

    def record_failure(self, provider_id: str, error_type: str = "generic",
                       tokens_used: int = 0):
        """
        Records a failure and applies adaptive cooldown.
        error_type: "rate_limit" | "quota_exhausted" | "timeout" | "generic"
        """
        h = self.get_health(provider_id)
        h.total_calls += 1
        h.consecutive_failures += 1
        h.last_failure_at = time.time()
        h.total_tokens_used += tokens_used

        if error_type == "quota_exhausted":
            h.state = ProviderState.EXHAUSTED
            h.cooldown_until = time.time() + 3600  # 1-hour hard cooldown
            logger.error(f"[ORCHESTRATOR] {provider_id} ❌ DAILY QUOTA EXHAUSTED. Cooling 1h.")
        elif error_type == "rate_limit":
            cooldown = self.COOLDOWN_TIERS.get(
                min(h.consecutive_failures, 4), 90
            )
            h.cooldown_until = time.time() + cooldown
            h.state = ProviderState.RATE_LIMITED
            logger.warning(f"[ORCHESTRATOR] {provider_id} ⏳ rate limited. Cooling {cooldown}s.")
        else:
            cooldown = self.COOLDOWN_TIERS.get(
                min(h.consecutive_failures, 4), 30
            )
            h.cooldown_until = time.time() + cooldown
            if h.consecutive_failures >= 3:
                h.state = ProviderState.COOLDOWN
                logger.warning(f"[ORCHESTRATOR] {provider_id} ⚠️ breaker tripped ({h.consecutive_failures} fails).")

    def is_available(self, provider_id: str) -> bool:
        h = self.get_health(provider_id)
        if h.state == ProviderState.EXHAUSTED:
            return False
        if h.state == ProviderState.UNAVAILABLE:
            return False
        if h.in_cooldown:
            return False
        return True

    def mark_unavailable(self, provider_id: str):
        h = self.get_health(provider_id)
        h.state = ProviderState.UNAVAILABLE

    def reset_provider(self, provider_id: str):
        """Resets circuit breaker state for a fresh company run."""
        if provider_id in self._health:
            h = self._health[provider_id]
            # Only reset transient failures — preserve daily quota exhaustion
            if h.state not in (ProviderState.EXHAUSTED, ProviderState.UNAVAILABLE):
                h.consecutive_failures = 0
                h.state = ProviderState.HEALTHY
                h.cooldown_until = 0.0

    def reset_all_transient(self):
        """Resets all transient circuit breakers before a new company batch."""
        for pid in list(self._health.keys()):
            self.reset_provider(pid)
        logger.info("[ORCHESTRATOR] All transient circuit breakers reset.")

    # ------------------------------------------------------------------
    # Retry-Storm Prevention
    # ------------------------------------------------------------------

    async def check_global_rate(self, max_calls_per_second: float = 3.0):
        """
        Prevents retry storms: if more than max_calls_per_second have been
        made globally in the last second, inject a small sleep.
        """
        async with self._global_lock:
            now = time.time()
            # prune calls older than 1s
            self._global_call_times = [t for t in self._global_call_times if now - t < 1.0]
            if len(self._global_call_times) >= max_calls_per_second:
                sleep_time = random.uniform(0.3, 0.8)
                logger.debug(f"[ORCHESTRATOR] Storm prevention: sleeping {sleep_time:.2f}s")
                await asyncio.sleep(sleep_time)
            self._global_call_times.append(time.time())

    # ------------------------------------------------------------------
    # Staggered Startup Jitter
    # ------------------------------------------------------------------

    @staticmethod
    async def stagger(base_ms: int = 150, jitter_ms: int = 100):
        """
        Inject a small random delay before the first call of a parallel
        research node to avoid simultaneous rate-limit hits.
        """
        delay = (base_ms + random.randint(0, jitter_ms)) / 1000.0
        await asyncio.sleep(delay)

    # ------------------------------------------------------------------
    # Summary Report
    # ------------------------------------------------------------------

    def get_summary(self) -> Dict[str, dict]:
        return {
            pid: {
                "state":        h.state.value,
                "success_rate": round(h.success_rate * 100, 1),
                "total_calls":  h.total_calls,
                "tokens_used":  h.total_tokens_used,
                "in_cooldown":  h.in_cooldown,
                "cooldown_remaining": max(0, round(h.cooldown_until - time.time(), 1))
                    if h.in_cooldown else 0,
            }
            for pid, h in self._health.items()
        }


# ---------------------------------------------------------------------------
# Semaphore Context Helper
# ---------------------------------------------------------------------------

class _SemaphoreContext:
    def __init__(self, semaphore: asyncio.Semaphore, provider_id: str):
        self._sem = semaphore
        self._provider_id = provider_id

    async def __aenter__(self):
        await self._sem.acquire()
        return self

    async def __aexit__(self, *args):
        self._sem.release()


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

orchestrator = ProviderOrchestrator()
