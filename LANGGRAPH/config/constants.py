"""
Global Constants for the Company Intelligence Platform
"""

# ---------------------------------------------------------------------------
# Workflow Constants
# ---------------------------------------------------------------------------
MAX_RETRIES = 3
DEFAULT_TIMEOUT_SECONDS = 60
CONCURRENCY_LIMIT = 1

# ---------------------------------------------------------------------------
# Model Names (Centralized Registry)
# ---------------------------------------------------------------------------
class ModelRegistry:
    LLAMA_3_1_8B = "llama-3.1-8b-instant"
    MISTRAL_7B = "cognitivecomputations/dolphin-mistral-24b-venice-edition:free"
    GEMMA_2_9B = "google/gemma-4-26b-a4b-it:free"
    DEEPSEEK_R1 = "deepseek/deepseek-v4-flash:free" # Kept as fallback

# ---------------------------------------------------------------------------
# Scoring & Consensus Thresholds
# ---------------------------------------------------------------------------
WEIGHT_ACCURACY = 0.45
WEIGHT_FRESHNESS = 0.35
WEIGHT_COMPLIANCE = 0.20

CONSENSUS_BONUS = 0.10
CONFIDENCE_THRESHOLD_MIN = 0.65

# ---------------------------------------------------------------------------
# Validation Constants
# ---------------------------------------------------------------------------
MIN_OVERVIEW_LENGTH = 50
MAX_NULL_DENSITY = 0.40

# ---------------------------------------------------------------------------
# Supabase Tables
# ---------------------------------------------------------------------------
TABLE_COMPANIES = "companies"
TABLE_INTELLIGENCE = "company_intelligence"
TABLE_AUDITS = "workflow_audits"
