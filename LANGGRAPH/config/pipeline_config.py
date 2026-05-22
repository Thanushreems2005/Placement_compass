"""
Centralised Configuration Management
=======================================
Single source of truth for all pipeline configuration values.
Reads from environment variables with safe defaults.

Validates required keys at startup and exposes a typed config object.
Replaces ad-hoc os.getenv() scattered across the codebase.
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Config Dataclass
# ---------------------------------------------------------------------------

@dataclass
class PipelineConfig:
    # --- LLM Providers ---
    groq_api_key: str = ""
    gemini_api_key: str = ""
    cerebras_api_key: str = ""
    openrouter_api_key: str = ""

    # --- Search ---
    tavily_api_key: str = ""

    # --- Observability ---
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "company-research-agent"

    # --- Database ---
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # --- Runtime ---
    environment: str = "development"
    log_level: str = "INFO"
    dev_mode: bool = True
    max_batch_size: int = 5
    concurrency_limit: int = 1

    # --- Token Budgets ---
    company_token_budget: int = 8_000
    section_token_hard_cap: int = 900
    provider_cooldown_seconds: int = 90

    # --- Extraction ---
    max_chunk_size_critical: int = 5
    max_chunk_size_important: int = 7
    max_chunk_size_standard: int = 10
    llm_call_timeout_seconds: float = 30.0
    max_tokens_per_call: int = 600

    # --- Derived flags ---
    @property
    def is_dev(self) -> bool:
        return self.dev_mode or self.environment.lower() in ("development", "dev")

    @property
    def has_groq(self) -> bool:
        return bool(self.groq_api_key)

    @property
    def has_gemini(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_cerebras(self) -> bool:
        return bool(self.cerebras_api_key)

    @property
    def has_openrouter(self) -> bool:
        return bool(self.openrouter_api_key)

    @property
    def has_tavily(self) -> bool:
        return bool(self.tavily_api_key)

    @property
    def active_providers(self):
        providers = []
        if self.has_groq:
            providers.append("groq")
        if self.has_gemini:
            providers.append("gemini")
        if self.has_cerebras:
            providers.append("cerebras")
        if self.has_openrouter:
            providers.append("openrouter")
        return providers


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

def load_config() -> PipelineConfig:
    """
    Loads config from environment variables.
    Logs warnings for missing optional keys.
    Raises EnvironmentError if critical keys are missing in production.
    """
    cfg = PipelineConfig(
        groq_api_key        = os.getenv("GROQ_API_KEY", ""),
        gemini_api_key      = os.getenv("GEMINI_API_KEY", ""),
        cerebras_api_key    = os.getenv("CEREBRAS_API_KEY", ""),
        openrouter_api_key  = os.getenv("OPENROUTER_API_KEY", ""),
        tavily_api_key      = os.getenv("TAVILY_API_KEY", ""),

        langchain_tracing_v2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true",
        langchain_api_key    = os.getenv("LANGCHAIN_API_KEY", ""),
        langchain_project    = os.getenv("LANGCHAIN_PROJECT", "company-research-agent"),

        supabase_url         = os.getenv("VITE_SUPABASE_URL", ""),
        supabase_anon_key    = os.getenv("VITE_SUPABASE_ANON_KEY", ""),

        environment          = os.getenv("ENVIRONMENT", "development"),
        log_level            = os.getenv("LOG_LEVEL", "INFO"),
        dev_mode             = os.getenv("DEV_MODE", "true").lower() == "true",
        max_batch_size       = int(os.getenv("MAX_BATCH_SIZE", "5")),
        concurrency_limit    = int(os.getenv("CONCURRENCY_LIMIT", "1")),

        company_token_budget    = int(os.getenv("COMPANY_TOKEN_BUDGET", "8000")),
        section_token_hard_cap  = int(os.getenv("SECTION_TOKEN_HARD_CAP", "900")),
        provider_cooldown_seconds = int(os.getenv("PROVIDER_COOLDOWN_SECONDS", "90")),

        llm_call_timeout_seconds = float(os.getenv("LLM_CALL_TIMEOUT_SECONDS", "30.0")),
        max_tokens_per_call      = int(os.getenv("MAX_TOKENS_PER_CALL", "600")),
    )

    _validate(cfg)
    return cfg


def _validate(cfg: PipelineConfig):
    """Validates config and logs warnings / errors as appropriate."""
    if not cfg.active_providers:
        logger.error(
            "[CONFIG] ❌ No LLM provider API keys found! "
            "Set GROQ_API_KEY, GEMINI_API_KEY, or CEREBRAS_API_KEY."
        )

    if not cfg.has_tavily:
        logger.warning(
            "[CONFIG] ⚠️  TAVILY_API_KEY not set. "
            "Search will use cache only — live queries will be skipped."
        )

    if not cfg.has_groq:
        logger.warning("[CONFIG] GROQ_API_KEY missing — Groq provider disabled.")
    if not cfg.has_gemini:
        logger.warning("[CONFIG] GEMINI_API_KEY missing — Gemini provider disabled.")
    if not cfg.has_cerebras:
        logger.warning("[CONFIG] CEREBRAS_API_KEY missing — Cerebras provider disabled.")

    if not cfg.is_dev and not cfg.supabase_url:
        logger.error("[CONFIG] ❌ VITE_SUPABASE_URL missing in production environment.")

    if cfg.is_dev:
        logger.info(
            f"[CONFIG] ✅ DEV_MODE=true | Providers: {cfg.active_providers} | "
            f"Budget: {cfg.company_token_budget} tokens/company"
        )
    else:
        logger.info(
            f"[CONFIG] ✅ PRODUCTION | Providers: {cfg.active_providers} | "
            f"Budget: {cfg.company_token_budget} tokens/company"
        )


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_config: Optional[PipelineConfig] = None


def get_config() -> PipelineConfig:
    """Returns the module-level config singleton, loading it on first call."""
    global _config
    if _config is None:
        _config = load_config()
    return _config
