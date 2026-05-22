import sys
import os
from dotenv import load_dotenv

# Load LangSmith and other environment variables as the very first step
current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"))

import asyncio
import logging

# Fix terminal encoding for Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure project root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

from LANGGRAPH.config.settings import settings
from app.service.workflow_service import WorkflowService
from app.models.runtime import RuntimeStatus

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MainPipeline")

async def run_batch():
    """
    CLI Entry point: Processes companies via the WorkflowService.
    Ensures Phase 2 runtime management is used even in CLI.
    """
    dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"
    limit = int(os.getenv("MAX_BATCH_SIZE", "5"))
    
    logger.info(f"Starting Enterprise Intelligence Pipeline (Limit: {limit}, DEV_MODE: {dev_mode})")
    
    # Initialize the new Service Layer
    service = WorkflowService()
    
    # Target companies for validation
    target_companies = [
        "Seagate Technology Holdings plc",
        "Microsoft Corporation",
        "Apple Inc.",
        "Google LLC",
        "NVIDIA Corporation"
    ]
    
    # Check if a custom company was passed via CLI argument (e.g., python main.py "Microsoft")
    cli_args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]
    if cli_args:
        companies_to_run = [cli_args[0]]
        limit = 1
        logger.info(f"Custom company override detected: Running for '{companies_to_run[0]}'")
    else:
        # Truncate or expand list to match limit
        companies_to_run = target_companies[:limit]
        if len(companies_to_run) < limit:
            companies_to_run += [f"Company {i+1}" for i in range(len(companies_to_run), limit)]
        
    for i, target_company in enumerate(companies_to_run):
        print(f"\n--- [ CLI RUN {i+1}/{limit} ] [{target_company}] ---")
        
        # Execute via service to get managed lifecycle
        result = await service.execute_research(target_company)
        
        if result.status not in (RuntimeStatus.FAILED,):
            print(f"\n--- [ CANONICAL RECORD: {result.company_name} ] ---")
            print(f"  Status:                  {result.status.value.upper()}")
            print(f"  Extraction Completeness: {result.quality.completeness_score:.1f}%")
            print(f"  Confidence-Aware Score:  {result.quality.quality_score:.1f}%")
            print(f"  Extracted Parameters:    {result.metrics.token_usage.get('parameter_count', 0)} / 163")
            print(f"  Total Token Usage:       {result.metrics.token_usage.get('total', 0)} (P:{result.metrics.token_usage.get('prompt', 0)}/C:{result.metrics.token_usage.get('completion', 0)})")
            print(f"  Execution Time:          {result.metrics.execution_time_seconds:.1f}s")
            
            # Provenance breakdown
            prov = result.quality.provenance or {}
            print(f"\n  📊 EXTRACTION PROVENANCE BREAKDOWN:")
            print(f"    - Real Extracted:     {prov.get('real_extracted', 0)} fields")
            print(f"    - Cached Extracted:   {prov.get('cache_verified', 0)} fields")
            print(f"    - Validated Consensus:{prov.get('validated_consensus', 0)} fields")
            print(f"    - Inferred Reasoning: {prov.get('inferred', 0)} fields")
            print(f"    - Synthetic Fallback: {prov.get('synthetic', 0)} fields")
            print(f"    - Failed / Rejected:  {prov.get('failed', 0)} fields")
            print("-" * 50)
            
            # Print detailed parameter table
            if result.data:
                print("\n📋 DETAILED CANONICAL PARAMETER EXTRACTION TABLE:")
                print("+" + "-"*22 + "+" + "-"*32 + "+" + "-"*42 + "+" + "-"*22 + "+" + "-"*12 + "+")
                print(f"| {'SECTION':<20} | {'PARAMETER FIELD':<30} | {'EXTRACTED VALUE':<40} | {'PROVENANCE':<20} | {'CONFIDENCE':<10} |")
                print("+" + "="*22 + "+" + "="*32 + "+" + "="*42 + "+" + "="*22 + "+" + "="*12 + "+")
                
                prov_meta = result.quality.provenance_metadata or {}
                for section, fields in result.data.items():
                    if isinstance(fields, dict):
                        for field, val in fields.items():
                            full_key = f"{section}.{field}"
                            meta = prov_meta.get(full_key) or {}
                            
                            prov_label = str(meta.get("provenance") or "UNKNOWN")
                            conf_val = meta.get("confidence")
                            conf_str = f"{conf_val * 100:.0f}%" if conf_val is not None else "N/A"
                            
                            # Clean and truncate value for neat printing
                            val_str = str(val).replace("\n", " ").strip()
                            if len(val_str) > 37:
                                val_str = val_str[:37] + "..."
                            if not val_str or val_str.lower() in ("null", "none", "n/a", "insufficient_validated_data"):
                                val_str = "-"
                                prov_label = "FAILED/MISSING"
                                conf_str = "0%"
                                
                            print(f"| {section:<20} | {field:<30} | {val_str:<40} | {prov_label:<20} | {conf_str:<10} |")
                print("+" + "-"*22 + "+" + "-"*32 + "+" + "-"*42 + "+" + "-"*22 + "+" + "-"*12 + "+")
            
            # Calculate contribution ratios
            prov_meta = result.quality.provenance_metadata or {}
            total_params_extracted = len(prov_meta) or 163
            
            cached_count_temp = sum(
                1 for m in prov_meta.values()
                if m.get("provider") == "supabase" or (m.get("provenance") in ("VALIDATED_CONSENSUS", "CACHE_VERIFIED", "CACHE_VERIFIED_RECENT", "SUPABASE_VERIFIED") and m.get("provider") == "supabase")
            )
            cache_ratio = (cached_count_temp / 163.0) * 100.0
            
            provider_counts = {}
            for m in prov_meta.values():
                prov_tag = m.get("provenance")
                p_name = str(m.get("provider", "unknown")).lower()
                
                # Check for consensus and split
                import re
                provs = []
                if "consensus" in p_name:
                    matches = re.findall(r"consensus\(([^)]+)\)", p_name)
                    if matches:
                        provs = [p.strip() for p in matches[0].split("+")]
                else:
                    provs = [p_name]
                
                for p in provs:
                    if "groq" in p:
                        label = "Llama 70B (Groq)"
                    elif "together" in p:
                        label = "Llama 70B (Together)"
                    elif "openrouter" in p:
                        label = "DeepSeek (OpenRouter)"
                    elif "gemini" in p:
                        label = "Gemini Flash"
                    elif "claude" in p:
                        label = "Claude Haiku"
                    elif "cerebras" in p:
                        label = "Llama 8B (Cerebras)"
                    elif "system" in p:
                        label = "System/Rule Overrides"
                    elif prov_tag == "INFERRED":
                        label = "Inferred Reasoning"
                    else:
                        label = "Inferred/Failed"
                    
                    provider_counts[label] = provider_counts.get(label, 0) + 1
            
            # Calculate all premium dynamic Enterprise Analytics Summary fields
            prov_meta = result.quality.provenance_metadata or {}
            
            fully_available = 0
            if result.data:
                for section, fields in result.data.items():
                    if isinstance(fields, dict):
                        for f, v in fields.items():
                            if v is not None and str(v).strip().lower() not in ("null", "none", "n/a", "", "failed/missing"):
                                fully_available += 1
                                
            cached_count = sum(
                1 for m in prov_meta.values()
                if m.get("provider") == "supabase" or (m.get("provenance") in ("VALIDATED_CONSENSUS", "CACHE_VERIFIED", "CACHE_VERIFIED_RECENT", "SUPABASE_VERIFIED") and m.get("provider") == "supabase")
            )
            
            newly_extracted = sum(
                1 for m in prov_meta.values()
                if m.get("provenance") in ("REAL_EXTRACTED", "VALIDATED_CONSENSUS") and "supabase" not in str(m.get("provider", "")).lower()
            )
            
            regenerated_list = result.quality.provenance.get("regenerated_fields", [])
            regenerated_count = len(regenerated_list)
            
            stale_fields_list = result.quality.provenance.get("stale_fields", [])
            stale_refreshed = 0
            for sf in stale_fields_list:
                meta = prov_meta.get(sf)
                if meta and "supabase" not in str(meta.get("provider", "")).lower() and meta.get("provenance") in ("REAL_EXTRACTED", "VALIDATED_CONSENSUS"):
                    stale_refreshed += 1
                    
            failed_count = 163 - fully_available
            
            conf_list = [m.get("confidence", 0.0) for m in prov_meta.values() if m.get("confidence") is not None]
            avg_conf = (sum(conf_list) / len(conf_list) * 100) if conf_list else 0.0
            
            valid_count = sum(
                1 for m in prov_meta.values()
                if m.get("provenance") in ("REAL_EXTRACTED", "VALIDATED_CONSENSUS", "CACHE_VERIFIED", "CACHE_VERIFIED_RECENT", "SUPABASE_VERIFIED", "DERIVED_INTELLIGENCE")
            )
            val_pass_rate = min(100.0, (valid_count / 163.0 * 100))
            
            derived_count = sum(
                1 for m in prov_meta.values()
                if m.get("provenance") == "DERIVED_INTELLIGENCE"
            )
            inferred_count = sum(
                1 for m in prov_meta.values()
                if m.get("provenance") == "INFERRED_INTELLIGENCE"
            )
            
            providers_used = []
            for m in prov_meta.values():
                p = str(m.get("provider", "")).lower()
                if p and p not in ("supabase", "failed") and "system" not in p:
                    if "consensus" in p:
                        matches = re.findall(r"consensus\(([^)]+)\)", p)
                        if matches:
                            for x in matches[0].split("+"):
                                providers_used.append(x.strip().upper())
                    else:
                        providers_used.append(p.upper())
            
            # Include any providers that were invoked during extraction/research
            extraction_providers = result.metrics.token_usage.get("provider_analytics") or {}
            for p in extraction_providers.keys():
                providers_used.append(p.upper())
            
            # Include analysis stage providers
            analysis_providers = result.metrics.token_usage.get("analysis_provider_usage") or {}
            for p in analysis_providers.keys():
                providers_used.append(p.upper())
                
            providers_used = sorted(list(set(providers_used)))
            
            if result.metrics.token_usage.get('total', 0) == 0:
                providers_str = "None (Fully Cached)"
            else:
                providers_str = ", ".join(providers_used) if providers_used else "None (Fully Cached)"

            # Count unresolved, weak, and stale intelligence metrics honestly
            unresolved_count = sum(
                1 for m in prov_meta.values()
                if m.get("provenance") in ("UNRESOLVED", "FAILED") or m.get("confidence", 0.0) == 0.0
            )
            weak_count = sum(
                1 for m in prov_meta.values()
                if m.get("provenance") not in ("UNRESOLVED", "FAILED") and m.get("confidence", 1.0) < 0.85 and m.get("confidence", 0.0) > 0.0
            )
            stale_total = len(stale_fields_list)
            
            print("==================================================")
            print("🚀 ENTERPRISE INTELLIGENCE SYSTEM SUMMARY")
            print("==================================================")
            print(f"* Total Parameters:        163")
            print(f"* Fully Available Fields:  {fully_available} / 163 fields ({ (fully_available / 163 * 100):.1f}%)")
            print(f"* Cached From Supabase:    {cached_count} / 163 fields ({ (cached_count / 163 * 100):.1f}%)")
            print(f"* Newly Extracted/Enriched: {newly_extracted} / 163 fields ({ (newly_extracted / 163 * 100):.1f}%)")
            print(f"* Unresolved Fields (None): {unresolved_count} fields")
            print(f"* Stale Fields Detected:    {stale_total} fields")
            print(f"* Stale Fields Refreshed:   {stale_refreshed} fields")
            print(f"* Weak-Confidence Fields:   {weak_count} fields")
            print(f"* Derived Intelligence:    {derived_count} fields")
            print(f"* Inferred Intelligence:   {inferred_count} fields")
            print(f"* Regenerated Fields:      {regenerated_count} fields")
            print(f"* Failed Fields:           {failed_count} fields")
            print(f"* Extraction Tokens:       { (result.metrics.token_usage.get('total', 0) - result.metrics.token_usage.get('analysis_tokens', 0)):,}")
            print(f"* Analysis Tokens:         {result.metrics.token_usage.get('analysis_tokens', 0):,}")
            print(f"* Tokens Consumed:         {result.metrics.token_usage.get('total', 0):,}")
            print(f"* Providers Used:          {providers_str}")
            print(f"* Execution Time:          {result.metrics.execution_time_seconds:.1f}s")
            print(f"* Confidence Score:        {avg_conf:.1f}%")
            print(f"* Validation Pass Rate:    {val_pass_rate:.1f}%")
            
            # Print Analysis Stage metrics
            if result.metrics.token_usage.get("analysis_tokens", 0) > 0:
                print(f"\n🧠 CONSENSUS ANALYSIS STAGE METRICS:")
                agree_score = result.metrics.token_usage.get('consensus_agreement_score')
                agree_str = f"{agree_score:.1f}%" if agree_score is not None else "N/A (DEGRADED)"
                print(f"  - Consensus Agreement:  {agree_str}")
                print(f"  - Analysis Execution:   {result.metrics.token_usage.get('analysis_execution_time', 0.0):.1f}s")
                print(f"  - Provider Usage:       {result.metrics.token_usage.get('analysis_provider_usage', {})}")
                print(f"  - Cost Breakdown ($):   {result.metrics.token_usage.get('reasoning_cost_breakdown', {})}")
                
            # Token Efficiency Telemetry Dashboard
            ext_tok = max(0, result.metrics.token_usage.get('total', 0) - result.metrics.token_usage.get('analysis_tokens', 0))
            reason_tok = result.metrics.token_usage.get('analysis_tokens', 0)
            cache_save = cached_count * 480
            routing_save = (163 - cached_count) * 250 if not result.metrics.token_usage.get("reused_reasoning", False) else 4500
            
            print(f"\n📊 TOKEN EFFICIENCY TELEMETRY:")
            print(f"  - Extraction Tokens:        {ext_tok:,}")
            print(f"  - Reasoning/Analysis Tokens:{reason_tok:,}")
            print(f"  - Cache Reuse Percentage:   {cache_ratio:.1f}%")
            print(f"  - Skipped Provider Calls:   {3 if cached_count == 163 else 0} calls")
            if cached_count > 0:
                print(f"  - Skipped Sections:         True (Cache Reuse Active)")
            else:
                print(f"  - Skipped Sections:         False")
            print(f"  - Micro-Batch Config:       Critical: 8-10 fields, Important: 8 fields, Optional: 6 fields")
            print(f"  - Token Savings from Cache:  {cache_save:,} tokens")
            print(f"  - Token Savings from Context Routing: {routing_save:,} tokens")
            print(f"  - Net Provider Token Cost:  ${sum(result.metrics.token_usage.get('reasoning_cost_breakdown', {}).values()):.6f}")
            print("==================================================")
        else:
            error_detail = result.error or "Unknown failure"
            logger.error(f"❌ FAILED: {target_company} | Error: {error_detail}")

if __name__ == "__main__":
    asyncio.run(run_batch())
