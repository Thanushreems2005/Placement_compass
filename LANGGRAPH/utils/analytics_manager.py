import json
import os
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class AnalyticsManager:
    def __init__(self, output_path: str = "logs/token_analytics.json"):
        self.output_path = output_path
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

    def aggregate_and_save(self, all_calls: List[Dict[str, Any]]):
        """Aggregates LLM call metadata and saves to JSON."""
        if not all_calls:
            logger.warning("No LLM calls to aggregate.")
            return {}

        analytics = {
            "summary": {
                "total_calls": len(all_calls),
                "total_tokens": sum(c.get("total_tokens", 0) for c in all_calls),
                "prompt_tokens": sum(c.get("prompt_tokens", 0) for c in all_calls),
                "completion_tokens": sum(c.get("completion_tokens", 0) for c in all_calls),
                "total_latency": sum(c.get("latency", 0) for c in all_calls),
                "avg_latency": sum(c.get("latency", 0) for c in all_calls) / len(all_calls),
                "success_rate": sum(1 for c in all_calls if c.get("status") == "success") / len(all_calls),
                "total_retries": sum(c.get("retry_count", 0) for c in all_calls),
                "degraded_executions": sum(1 for c in all_calls if c.get("degraded", False)),
                "failed_requests": sum(1 for c in all_calls if c.get("status") in ["error", "circuit_broken"]),
                "failed_token_waste": sum(c.get("total_tokens", 0) for c in all_calls if c.get("status") != "success"),
                "retry_token_waste": sum(c.get("prompt_tokens", 0) * c.get("retry_count", 0) for c in all_calls)
            },
            "by_model": {},
            "by_section": {},
            "by_company": {},
            "raw_calls": all_calls
        }

        # Aggregate by Model
        for call in all_calls:
            model = call.get("model_name", "unknown")
            if model not in analytics["by_model"]:
                analytics["by_model"][model] = {"tokens": 0, "calls": 0, "latency_sum": 0, "failures": 0}
            analytics["by_model"][model]["tokens"] += call.get("total_tokens", 0)
            analytics["by_model"][model]["calls"] += 1
            analytics["by_model"][model]["latency_sum"] += call.get("latency", 0)
            if call.get("status") != "success":
                analytics["by_model"][model]["failures"] += 1

        # Aggregate by Section
        for call in all_calls:
            section = call.get("section", "unknown")
            if section not in analytics["by_section"]:
                analytics["by_section"][section] = {"tokens": 0, "calls": 0}
            analytics["by_section"][section]["tokens"] += call.get("total_tokens", 0)
            analytics["by_section"][section]["calls"] += 1

        # Aggregate by Company
        for call in all_calls:
            company = call.get("company", "unknown")
            if company not in analytics["by_company"]:
                analytics["by_company"][company] = {"tokens": 0, "calls": 0}
            analytics["by_company"][company]["tokens"] += call.get("total_tokens", 0)
            analytics["by_company"][company]["calls"] += 1

        # Save to file
        with open(self.output_path, "w") as f:
            json.dump(analytics, f, indent=2)
        
        logger.info(f"Analytics saved to {self.output_path}")
        return analytics

    def print_terminal_summary(self, analytics: Dict[str, Any], total_companies: int = 140):
        """Prints a professional summary to the terminal."""
        summary = analytics.get("summary", {})
        if not summary:
            return

        print("\n" + "="*50)
        print("🚀 ENTERPRISE ANALYTICS SUMMARY")
        print("="*50)
        print(f"Total Tokens Used:      {summary['total_tokens']:,}")
        
        companies_run = len(analytics.get("by_company", {}))
        avg_per_company = summary['total_tokens'] / companies_run if companies_run > 0 else 0
        print(f"Avg Tokens/Company:     {avg_per_company:,.0f}")
        
        print(f"Total Retries:          {summary['total_retries']}")
        print(f"Failed Requests:        {summary['failed_requests']}")
        print(f"Degraded Executions:    {summary['degraded_executions']}")
        
        # Projections
        projected = avg_per_company * total_companies
        print("-" * 50)
        print(f"Projected (140 Cos):    {projected:,.0f} tokens")
        
        # Reliability & Cost
        if analytics["by_model"]:
             most_reliable = min(analytics["by_model"].items(), key=lambda x: x[1]["failures"] / x[1]["calls"])[0]
             print(f"Most Reliable Model:    {most_reliable}")
        
        if analytics["by_section"]:
             most_expensive = max(analytics["by_section"].items(), key=lambda x: x[1]["tokens"])[0]
             print(f"Most Expensive Section: {most_expensive}")
        
        print("="*50 + "\n")
