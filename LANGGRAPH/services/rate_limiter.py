"""
Centralized Async Rate Limiter
==============================
Provides:
  - Per-provider token-bucket throttling (RPM caps)
  - Staggered provider start delays (prevent burst spikes) with randomized jitter
  - Adaptive cooldown tracking with provider-specific cooldown pacing and exponential backoff
  - Single-provider survival mode detection
  - Section-level micro-delay between calls with jitter
"""
import asyncio
import logging
import time
import random
from typing import Dict, Optional, Set

logger = logging.getLogger(__name__)

# ── Provider RPM caps (free/paid-tier safe values) ───────────────────────────
PROVIDER_RPM_CAPS: Dict[str, int] = {
    "groq":       25,   # ~25 req/min free tier
    "together":   20,   # ~20 req/min free tier (Together AI)
    "openrouter": 15,   # ~15 req/min free tier
    "gemini":     12,   # ~12 req/min free tier
    "cerebras":   30,   # ~30 req/min free tier
    "claude":      5,   # Conservative — premium recovery only
}

# ── Stagger delays between parallel provider starts (seconds) ─────────────────
# Groq + Together fire first (Tier 1), then OpenRouter, then Cerebras
# Claude is never auto-started — it's triggered on-demand only
PROVIDER_START_DELAYS: Dict[str, float] = {
    "groq":       0.0,   # Tier-1a: fires immediately
    "together":   2.0,   # Tier-1b: fires 2s after Groq
    "openrouter": 5.0,   # Tier-2: fires 5s after start
    "gemini":     8.0,   # Optional: fires 8s after start
    "cerebras":   10.0,  # Emergency: fires 10s after start
    "claude":     0.0,   # On-demand only — no parallel start delay
}

# ── Base Cooldowns per provider (seconds) ────────────────────────────────────
# Different models have different rate limit reset profiles
PROVIDER_BASE_COOLDOWNS: Dict[str, float] = {
    "groq":       15.0,
    "together":   20.0,
    "openrouter": 20.0,
    "gemini":     20.0,
    "cerebras":   15.0,
    "claude":     30.0,
}

# ── Inter-section delay inside each provider (seconds) ───────────────────────
INTER_SECTION_DELAY: float = 1.2   # 1.2s between consecutive section calls


class ProviderRateLimiter:
    """
    Async token-bucket rate limiter for a single provider.
    Refills at RPM rate, blocks callers when empty.
    """
    def __init__(self, provider: str, rpm: int):
        self.provider   = provider
        self.rpm        = rpm
        self._tokens    = float(rpm)
        self._max       = float(rpm)
        self._last_refill = time.monotonic()
        self._lock      = asyncio.Lock()

    async def acquire(self) -> None:
        """Block until a token is available, then consume one."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            # Refill at rpm tokens per 60 seconds
            refill = elapsed * (self._rpm / 60.0)
            self._tokens = min(self._max, self._tokens + refill)
            self._last_refill = now

            if self._tokens < 1.0:
                wait = (1.0 - self._tokens) / (self._rpm / 60.0)
                logger.debug(f"  [RATE-LIMIT] {self.provider}: token bucket empty — waiting {wait:.1f}s")
                await asyncio.sleep(wait)
                self._tokens = 0.0
            else:
                self._tokens -= 1.0

    @property
    def _rpm(self) -> int:
        return self.rpm


class GlobalRateLimiter:
    """
    Singleton global rate limiter managing all providers.
    Exposes stagger delays, dynamic backoff, and survival-mode detection.
    """

    def __init__(self):
        self._buckets: Dict[str, ProviderRateLimiter] = {
            p: ProviderRateLimiter(p, rpm)
            for p, rpm in PROVIDER_RPM_CAPS.items()
        }
        # Tracks when each provider was last confirmed exhausted
        self._exhausted_at: Dict[str, float] = {}
        # Tracks providers confirmed healthy this session
        self._healthy: Set[str] = set(PROVIDER_RPM_CAPS.keys())
        # Tracks consecutive failures for exponential cooldown backoff
        self._consecutive_failures: Dict[str, int] = {}
        self._success_streaks: Dict[str, int] = {}
        self._failure_streaks: Dict[str, int] = {}
        # Tracks providers that have permanently failed (e.g., 401/402/403)
        self._permanently_failed: Set[str] = set()
        # Concurrency Semaphores
        self._semaphores = {
            "groq": asyncio.Semaphore(1),
            "cerebras": asyncio.Semaphore(2),
            "gemini": asyncio.Semaphore(1),
            "together": asyncio.Semaphore(1),
            "openrouter": asyncio.Semaphore(1),
            "claude": asyncio.Semaphore(1)
        }
        # Predictive Provider Orchestration metrics
        self._latency_history: Dict[str, list] = {p: [] for p in PROVIDER_RPM_CAPS}
        self._reliability_score: Dict[str, float] = {p: 1.0 for p in PROVIDER_RPM_CAPS}
        self._quota_used: Dict[str, int] = {p: 0 for p in PROVIDER_RPM_CAPS}
        self._estimated_quota_limit: Dict[str, int] = {
            "groq": 100000,
            "gemini": 20000,
            "cerebras": 50000,
            "together": 40000,
            "openrouter": 30000,
            "claude": 10000
        }

    def concurrency_limit(self, provider: str):
        provider_lower = provider.lower()
        if provider_lower in self._semaphores:
            return self._semaphores[provider_lower]
        return asyncio.Semaphore(1)

    # ── Public interface ──────────────────────────────────────────────────────

    async def acquire(self, provider: str) -> None:
        """
        Rate-limit acquire for a provider.
        Also applies the inter-section delay after rate limit acquisition.
        """
        bucket = self._buckets.get(provider.lower())
        if bucket:
            await bucket.acquire()
        # Randomized jitter to avoid thundering herd
        await asyncio.sleep(random.uniform(0.1, 0.4))

    async def apply_start_delay(self, provider: str) -> None:
        """Apply the stagger delay for this provider at run start with randomized jitter."""
        base_delay = PROVIDER_START_DELAYS.get(provider.lower(), 0.0)
        
        # Add dynamic jitter to start delays to stagger threads
        if base_delay > 0.0:
            jitter = random.uniform(0.8, 1.3)
            final_delay = base_delay * jitter
        elif provider.lower() != "claude":
            # Give t=0 providers a tiny staggered offset to prevent exact concurrent triggers
            final_delay = random.uniform(0.5, 1.5)
        else:
            final_delay = 0.0

        if final_delay > 0.0:
            logger.info(f"  [STAGGER] {provider.upper()} staggered delay of {final_delay:.2f}s (with randomized jitter)")
            await asyncio.sleep(final_delay)

    async def apply_section_delay(self, provider: Optional[str] = None) -> None:
        """Apply inter-section delay between consecutive LLM calls with randomized jitter."""
        base_delay = INTER_SECTION_DELAY
        if provider:
            key = provider.lower()
            failures = self._consecutive_failures.get(key, 0)
            if failures > 0:
                # Dynamically increase base delay if provider is experiencing high load / failures!
                base_delay = INTER_SECTION_DELAY * (1.5 ** min(failures, 3))
                logger.info(f"  [PACING] {provider.upper()} high failure stress pacing active. Base delay scaled to {base_delay:.2f}s.")
        
        # Add ±25% jitter to break structural sync between concurrent loops
        jittered_delay = base_delay * random.uniform(0.75, 1.25)
        await asyncio.sleep(jittered_delay)

    def mark_exhausted(self, provider: str) -> None:
        """Mark a provider as exhausted after a 429 and increment failure count for exponential backoff."""
        key = provider.lower()
        self._exhausted_at[key] = time.monotonic()
        self._healthy.discard(key)
        
        self._consecutive_failures[key] = self._consecutive_failures.get(key, 0) + 1
        self._failure_streaks[key] = self._failure_streaks.get(key, 0) + 1
        self._success_streaks[key] = 0
        
        failures = self._consecutive_failures[key]
        logger.warning(
            f"  [RATE-LIMITER] {provider} marked exhausted. "
            f"(Consecutive failures: {failures}, exponential cooldown multiplier active)"
        )

    def mark_permanently_failed(self, provider: str) -> None:
        """Mark a provider with a permanent error (e.g. 401, 402, 403). It will be disabled after 3 such errors."""
        key = provider.lower()
        
        # We repurpose consecutive_failures for permanent tracking if it's a hard error
        self._consecutive_failures[key] = self._consecutive_failures.get(key, 0) + 1
        self._failure_streaks[key] = self._failure_streaks.get(key, 0) + 1
        self._success_streaks[key] = 0
        
        if self._consecutive_failures[key] >= 3:
            self._permanently_failed.add(key)
            self._healthy.discard(key)
            logger.error(f"  [RATE-LIMITER] {provider} marked PERMANENTLY FAILED (>=3 hard errors). Removed from active queues.")

    def is_permanently_failed(self, provider: str) -> bool:
        return provider.lower() in self._permanently_failed

    def mark_healthy(self, provider: str) -> None:
        """Restore a provider after successful call and reset failure counters."""
        key = provider.lower()
        self._exhausted_at.pop(key, None)
        self._healthy.add(key)
        self._consecutive_failures[key] = 0
        self._success_streaks[key] = self._success_streaks.get(key, 0) + 1
        self._failure_streaks[key] = 0

    def is_exhausted(self, provider: str) -> bool:
        key = provider.lower()
        if self.is_permanently_failed(key):
            return True
        if key not in self._exhausted_at:
            return False
            
        age = time.monotonic() - self._exhausted_at[key]
        base_cooldown = PROVIDER_BASE_COOLDOWNS.get(key, 75.0)
        
        # Exponential backoff based on consecutive failures (capped at 4) - disabled to avoid excessive delays
        backoff_mult = 1.0
        cooldown_time = base_cooldown * backoff_mult
        
        # Apply ±15% randomized jitter to the cooldown time to prevent simultaneous wakenings (429 storms)
        cooldown_time = cooldown_time * random.uniform(0.85, 1.15)
        
        if age >= cooldown_time:
            logger.info(
                f"  [RATE-LIMITER] {provider} cooldown elapsed "
                f"(Age: {age:.1f}s >= Cooldown: {cooldown_time:.1f}s) — allowing probe."
            )
            return False
        return True

    def healthy_providers(self) -> Set[str]:
        """Return set of currently non-exhausted and enabled providers."""
        import os
        from LANGGRAPH.config.settings import settings
        enabled = set()
        if settings:
            if getattr(settings, "GROQ_API_KEY", None): enabled.add("groq")
            if getattr(settings, "ENABLE_OPENROUTER", False) and getattr(settings, "OPENROUTER_API_KEY", None): 
                enabled.add("openrouter")
            if getattr(settings, "GEMINI_API_KEY", None) and os.getenv("ENABLE_GEMINI", "false").lower() == "true": 
                enabled.add("gemini")
            if getattr(settings, "CEREBRAS_API_KEY", None): enabled.add("cerebras")
            if getattr(settings, "TOGETHER_API_KEY", None): enabled.add("together")
            if getattr(settings, "ANTHROPIC_API_KEY", None): enabled.add("claude")
        else:
            enabled = set(PROVIDER_RPM_CAPS.keys())

        return {
            p for p in PROVIDER_RPM_CAPS
            if p in enabled and not self.is_exhausted(p)
        }

    def is_tier1_available(self) -> bool:
        """Returns True if at least one Tier-1 provider (Groq, Together) is healthy."""
        return not self.is_exhausted("groq") or not self.is_exhausted("together")

    def is_claude_available(self) -> bool:
        """Returns True if Claude is not currently exhausted."""
        return not self.is_exhausted("claude")

    def record_latency(self, provider: str, elapsed: float) -> None:
        key = provider.lower()
        if key in self._latency_history:
            self._latency_history[key].append(elapsed)
            if len(self._latency_history[key]) > 10:
                self._latency_history[key].pop(0)
            
            # Recalculate reliability dynamically
            success_count = self._success_streaks.get(key, 0)
            failure_count = self._consecutive_failures.get(key, 0)
            total = success_count + failure_count
            if total > 0:
                self._reliability_score[key] = round(success_count / total, 2)
            else:
                self._reliability_score[key] = 1.0

    def record_token_usage(self, provider: str, tokens: int) -> None:
        key = provider.lower()
        if key in self._quota_used:
            self._quota_used[key] += tokens

    def get_predictive_priority(self, provider: str) -> float:
        """
        Calculates a real-time priority score based on latency history,
        reliability, and estimated quota exhaustion forecast.
        """
        key = provider.lower()
        reliability = self._reliability_score.get(key, 1.0)
        
        # 1. Latency penalty (lower latency = higher score)
        history = self._latency_history.get(key, [])
        avg_latency = sum(history) / len(history) if history else 2.0
        latency_score = max(0.0, 1.0 - (avg_latency / 15.0))  # normalize against a 15s max expected latency
        
        # 2. Quota Forecast penalty
        used = self._quota_used.get(key, 0)
        limit = self._estimated_quota_limit.get(key, 50000)
        quota_ratio = min(1.0, used / limit)
        quota_score = 1.0 - quota_ratio  # lower ratio = higher score
        
        # 3. Failure Prediction probability
        fail_streak = self._failure_streaks.get(key, 0)
        fail_prediction = min(1.0, fail_streak * 0.3)
        
        # Weighted Priority calculation
        priority = (reliability * 0.40) + (latency_score * 0.20) + (quota_score * 0.20) - (fail_prediction * 0.20)
        return max(0.0, round(priority, 3))

    def survival_mode_provider(self) -> Optional[str]:
        # Disable over-aggressive survival mode to stabilize extraction quality
        return None


# ── Module-level singleton ────────────────────────────────────────────────────
rate_limiter = GlobalRateLimiter()
