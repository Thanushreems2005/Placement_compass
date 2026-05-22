"""
Execution Observability & Structured Logging
=============================================
Centralised logging helpers and execution-summary reporters.

Features:
  - Structured per-node timings
  - Section-level extraction statistics
  - Provider-failure diagnostics
  - Retry analytics
  - LangSmith trace metadata enrichment
  - Developer-mode pretty-print summaries
"""

import logging
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Execution Timer (node-level)
# ---------------------------------------------------------------------------

class ExecutionTimer:
    """
    Lightweight context manager for measuring node/section execution time.

    Usage:
        async with ExecutionTimer("phase2_research.groq") as t:
            ...
        print(t.elapsed)
    """

    def __init__(self, label: str):
        self.label = label
        self.start: float = 0.0
        self.elapsed: float = 0.0

    async def __aenter__(self):
        self.start = time.perf_counter()
        return self

    async def __aexit__(self, *args):
        self.elapsed = time.perf_counter() - self.start
        logger.debug(f"[TIMER] {self.label}: {self.elapsed:.3f}s")


# ---------------------------------------------------------------------------
# Section Execution Stats
# ---------------------------------------------------------------------------

class SectionStats:
    """Accumulates extraction metrics for a single section across all providers."""

    def __init__(self, section_name: str):
        self.section_name = section_name
        self.total_fields = 0
        self.extracted_fields: Dict[str, Any] = {}   # field → value
        self.provider_contributions: Dict[str, int] = defaultdict(int)
        self.batch_timings: List[float] = []
        self.token_usage: int = 0
        self.failed_batches: int = 0
        self.successful_batches: int = 0

    def record_batch(self, provider: str, fields_extracted: int,
                     tokens: int, elapsed: float, success: bool):
        if success:
            self.successful_batches += 1
            self.provider_contributions[provider] += fields_extracted
        else:
            self.failed_batches += 1
        self.batch_timings.append(elapsed)
        self.token_usage += tokens

    @property
    def success_rate(self) -> float:
        total = self.successful_batches + self.failed_batches
        return self.successful_batches / total if total > 0 else 0.0

    @property
    def avg_batch_time(self) -> float:
        return sum(self.batch_timings) / len(self.batch_timings) if self.batch_timings else 0.0

    def to_dict(self) -> Dict:
        return {
            "section":               self.section_name,
            "total_fields_target":   self.total_fields,
            "extracted_count":       len(self.extracted_fields),
            "coverage_pct":          round(len(self.extracted_fields) / max(self.total_fields, 1) * 100, 1),
            "successful_batches":    self.successful_batches,
            "failed_batches":        self.failed_batches,
            "success_rate":          round(self.success_rate * 100, 1),
            "token_usage":           self.token_usage,
            "avg_batch_time_s":      round(self.avg_batch_time, 3),
            "provider_contributions": dict(self.provider_contributions),
        }


# ---------------------------------------------------------------------------
# Provider Diagnostics
# ---------------------------------------------------------------------------

class ProviderDiagnostics:
    """Accumulates failure diagnostics across providers for a run."""

    def __init__(self):
        self._events: List[Dict[str, Any]] = []

    def record_failure(self, provider: str, model: str, section: str,
                       error_type: str, error_msg: str, retry_count: int = 0):
        self._events.append({
            "provider":    provider,
            "model":       model,
            "section":     section,
            "error_type":  error_type,
            "error_msg":   error_msg[:200],
            "retry_count": retry_count,
            "timestamp":   time.time(),
        })

    def record_recovery(self, provider: str, fallback: str, section: str):
        logger.info(f"[DIAG] {provider} → fallback {fallback} for {section}")
        self._events.append({
            "provider":   provider,
            "event":      "fallback_recovery",
            "fallback":   fallback,
            "section":    section,
            "timestamp":  time.time(),
        })

    def get_failure_summary(self) -> Dict[str, Any]:
        by_provider: Dict[str, int] = defaultdict(int)
        by_error: Dict[str, int] = defaultdict(int)
        by_section: Dict[str, int] = defaultdict(int)

        for ev in self._events:
            if "error_type" in ev:
                by_provider[ev["provider"]] += 1
                by_error[ev["error_type"]] += 1
                by_section[ev["section"]] += 1

        return {
            "total_failures":      len([e for e in self._events if "error_type" in e]),
            "by_provider":         dict(by_provider),
            "by_error_type":       dict(by_error),
            "by_section":          dict(by_section),
            "fallback_recoveries": len([e for e in self._events if e.get("event") == "fallback_recovery"]),
        }

    @property
    def events(self) -> List[Dict]:
        return list(self._events)


# ---------------------------------------------------------------------------
# Run Observability Report
# ---------------------------------------------------------------------------

class RunObservabilityReport:
    """
    Aggregates all observability data for a single company run.
    Printed at the end of a run and optionally sent to LangSmith.
    """

    def __init__(self, company_name: str, run_id: str):
        self.company_name = company_name
        self.run_id = run_id
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.node_timings: Dict[str, float] = {}
        self.section_stats: Dict[str, SectionStats] = {}
        self.provider_diag = ProviderDiagnostics()
        self.provenance_counts: Dict[str, int] = {}
        self.total_tokens: int = 0
        self.final_status: str = "unknown"

    # ---- Setters ----

    def record_node_timing(self, node_name: str, elapsed: float):
        self.node_timings[node_name] = round(elapsed, 3)

    def get_section_stats(self, section_name: str) -> SectionStats:
        if section_name not in self.section_stats:
            self.section_stats[section_name] = SectionStats(section_name)
        return self.section_stats[section_name]

    def finalize(self, status: str, provenance_counts: Dict[str, int], total_tokens: int):
        self.end_time = time.time()
        self.final_status = status
        self.provenance_counts = provenance_counts
        self.total_tokens = total_tokens

    # ---- Output ----

    @property
    def elapsed_seconds(self) -> float:
        end = self.end_time or time.time()
        return round(end - self.start_time, 1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id":          self.run_id,
            "company":         self.company_name,
            "status":          self.final_status,
            "elapsed_s":       self.elapsed_seconds,
            "total_tokens":    self.total_tokens,
            "provenance":      self.provenance_counts,
            "node_timings":    self.node_timings,
            "section_stats":   {k: v.to_dict() for k, v in self.section_stats.items()},
            "provider_diag":   self.provider_diag.get_failure_summary(),
        }

    def print_summary(self, dev_mode: bool = False):
        """Pretty-print terminal summary."""
        prov = self.provenance_counts
        real = (
            prov.get("real_extracted", 0)
            + prov.get("validated_consensus", 0)
            + prov.get("cache_verified", 0)
        )
        synth  = prov.get("synthetic", 0)
        failed = prov.get("failed", 0)
        inferred = prov.get("inferred", 0)
        total  = real + synth + failed + inferred or 163

        print("\n" + "=" * 52)
        print(f"📋 OBSERVABILITY REPORT — {self.company_name}")
        print("=" * 52)
        print(f"  Run ID:        {self.run_id}")
        print(f"  Status:        {self.final_status.upper()}")
        print(f"  Elapsed:       {self.elapsed_seconds}s")
        print(f"  Total Tokens:  {self.total_tokens:,}")
        print("-" * 52)
        print(f"  REAL Extracted:   {real:>4} / {total} ({real/total*100:.1f}%)")
        print(f"  Synthetic:        {synth:>4} / {total} ({synth/total*100:.1f}%)")
        print(f"  Failed:           {failed:>4} / {total} ({failed/total*100:.1f}%)")
        print(f"  Inferred:         {inferred:>4} / {total} ({inferred/total*100:.1f}%)")

        if dev_mode and self.section_stats:
            print("-" * 52)
            print("  Section Coverage:")
            for name, stats in self.section_stats.items():
                pct = round(len(stats.extracted_fields) / max(stats.total_fields, 1) * 100, 0)
                bar = "█" * int(pct // 10) + "░" * (10 - int(pct // 10))
                print(f"    {name:<28} [{bar}] {pct:.0f}%")

        if dev_mode:
            diag = self.provider_diag.get_failure_summary()
            if diag["total_failures"] > 0:
                print("-" * 52)
                print(f"  Provider Failures: {diag['total_failures']}")
                for p, cnt in diag["by_provider"].items():
                    print(f"    {p}: {cnt} failures")

        print("=" * 52 + "\n")

    def get_langsmith_metadata(self) -> Dict[str, Any]:
        """Returns a flat metadata dict suitable for LangSmith run tagging."""
        prov = self.provenance_counts
        return {
            "company":           self.company_name,
            "run_id":            self.run_id,
            "status":            self.final_status,
            "elapsed_s":         self.elapsed_seconds,
            "total_tokens":      self.total_tokens,
            "real_extracted":    prov.get("real_extracted", 0),
            "validated_consensus": prov.get("validated_consensus", 0),
            "synthetic":         prov.get("synthetic", 0),
            "failed":            prov.get("failed", 0),
            "node_timings":      str(self.node_timings),
        }
