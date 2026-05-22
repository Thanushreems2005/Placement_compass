"""
Token Budget Manager
=====================
Tracks and enforces per-provider, per-section, and per-company
token budgets so the pipeline never silently overspends quota.

Features:
  - Per-company token ceiling
  - Per-section soft caps (warn) and hard caps (abort batch)
  - Per-provider daily token accounting
  - Early-stop rule: abort remaining sections when > 80% of budget used
  - Dynamic batch-size scaling based on remaining budget
  - Cost estimation for projected 140-company runs
"""

import logging
from typing import Dict, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Budget Caps (conservative free-tier defaults)
# ---------------------------------------------------------------------------

# Max tokens allowed per company run across all providers
COMPANY_TOKEN_BUDGET = 8_000

# Per-section soft warning threshold (tokens)
SECTION_SOFT_CAP = 600

# Per-section hard cap — abort remaining batches in this section
SECTION_HARD_CAP = 900

# Fraction of company budget consumed before issuing early-stop warning
EARLY_STOP_FRACTION = 0.80

# Default prompt-only token estimate per field (for dynamic batch sizing)
TOKENS_PER_FIELD_ESTIMATE = 55

# Daily free-tier ceilings per provider (tokens/day)
PROVIDER_DAILY_LIMITS: Dict[str, int] = {
    "groq":       100_000,
    "gemini":     1_000_000,  # gemini-flash free tier (generous daily)
    "cerebras":   50_000,     # conservative estimate
    "openrouter": 20_000,     # free-model shared pool
}


# ---------------------------------------------------------------------------
# Budget Manager
# ---------------------------------------------------------------------------

@dataclass
class ProviderBudget:
    provider_id: str
    daily_limit: int
    tokens_used_today: int = 0

    @property
    def tokens_remaining(self) -> int:
        return max(0, self.daily_limit - self.tokens_used_today)

    @property
    def is_exhausted(self) -> bool:
        return self.tokens_used_today >= self.daily_limit


class TokenBudgetManager:
    """
    Tracks token consumption across the entire pipeline run.
    Called by the research node before and after every LLM call.
    """

    def __init__(self, company_budget: int = COMPANY_TOKEN_BUDGET):
        self.company_budget = company_budget
        self.company_tokens_used: int = 0

        # section → tokens consumed this company run
        self.section_tokens: Dict[str, int] = {}

        # provider budgets (singleton per process — carries across companies)
        self._provider_budgets: Dict[str, ProviderBudget] = {
            pid: ProviderBudget(provider_id=pid, daily_limit=limit)
            for pid, limit in PROVIDER_DAILY_LIMITS.items()
        }

    # ------------------------------------------------------------------
    # Accounting
    # ------------------------------------------------------------------

    def record_tokens(self, provider_id: str, section_name: str, tokens: int):
        """Record actual tokens consumed after a successful LLM call."""
        self.company_tokens_used += tokens
        self.section_tokens[section_name] = self.section_tokens.get(section_name, 0) + tokens

        budget = self._get_provider_budget(provider_id)
        budget.tokens_used_today += tokens

        logger.debug(
            f"[BUDGET] {provider_id}/{section_name}: +{tokens} tokens "
            f"(company total: {self.company_tokens_used}/{self.company_budget})"
        )

    def _get_provider_budget(self, provider_id: str) -> ProviderBudget:
        pid = provider_id.lower()
        if pid not in self._provider_budgets:
            self._provider_budgets[pid] = ProviderBudget(
                provider_id=pid, daily_limit=20_000
            )
        return self._provider_budgets[pid]

    # ------------------------------------------------------------------
    # Guard Checks
    # ------------------------------------------------------------------

    def check_company_budget(self) -> bool:
        """Returns True if we are still within the company token ceiling."""
        return self.company_tokens_used < self.company_budget

    def should_early_stop(self) -> bool:
        """Returns True when > EARLY_STOP_FRACTION of budget has been consumed."""
        ratio = self.company_tokens_used / self.company_budget
        if ratio >= EARLY_STOP_FRACTION:
            logger.warning(
                f"[BUDGET] Early-stop triggered: {self.company_tokens_used}/"
                f"{self.company_budget} tokens used ({ratio:.0%})."
            )
            return True
        return False

    def section_over_hard_cap(self, section_name: str) -> bool:
        used = self.section_tokens.get(section_name, 0)
        if used >= SECTION_HARD_CAP:
            logger.warning(
                f"[BUDGET] Section '{section_name}' hit hard cap "
                f"({used}/{SECTION_HARD_CAP} tokens). Aborting remaining batches."
            )
            return True
        return False

    def section_over_soft_cap(self, section_name: str) -> bool:
        used = self.section_tokens.get(section_name, 0)
        if used >= SECTION_SOFT_CAP:
            logger.debug(f"[BUDGET] Section '{section_name}' over soft cap ({used} tokens).")
            return True
        return False

    def provider_exhausted(self, provider_id: str) -> bool:
        return self._get_provider_budget(provider_id.lower()).is_exhausted

    # ------------------------------------------------------------------
    # Dynamic Batch Sizing
    # ------------------------------------------------------------------

    def suggested_chunk_size(self, remaining_budget: int, base_size: int) -> int:
        """
        Shrink chunk size dynamically when the budget is nearly consumed.
        Returns a chunk size between 1 and base_size.
        """
        max_fields = max(1, remaining_budget // TOKENS_PER_FIELD_ESTIMATE)
        return min(base_size, max_fields)

    # ------------------------------------------------------------------
    # Cost Estimation
    # ------------------------------------------------------------------

    def project_full_run_cost(self, total_companies: int = 140) -> Dict[str, int]:
        if self.company_tokens_used == 0:
            return {"projected_total": 0, "total_companies": total_companies}
        return {
            "tokens_this_company": self.company_tokens_used,
            "projected_total": self.company_tokens_used * total_companies,
            "total_companies": total_companies,
            "budget_per_company": self.company_budget,
            "budget_utilization_pct": round(
                (self.company_tokens_used / self.company_budget) * 100, 1
            ),
        }

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def get_summary(self) -> Dict:
        return {
            "company_tokens_used": self.company_tokens_used,
            "company_budget": self.company_budget,
            "budget_remaining": self.company_budget - self.company_tokens_used,
            "utilization_pct": round(
                (self.company_tokens_used / self.company_budget) * 100, 1
            ) if self.company_budget > 0 else 0,
            "section_breakdown": dict(self.section_tokens),
            "provider_daily_usage": {
                pid: {
                    "used": b.tokens_used_today,
                    "limit": b.daily_limit,
                    "remaining": b.tokens_remaining,
                    "exhausted": b.is_exhausted,
                }
                for pid, b in self._provider_budgets.items()
            },
        }

    def reset_for_new_company(self):
        """Reset per-company counters while preserving daily provider totals."""
        self.company_tokens_used = 0
        self.section_tokens = {}
