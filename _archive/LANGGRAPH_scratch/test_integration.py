import asyncio
import os
import sys

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from LANGGRAPH.graph.workflow import create_workflow
from LANGGRAPH.services.field_cache import field_cache

async def main():
    # 1. Clear local field cache to start fresh
    print("Clearing local field cache...")
    await field_cache.invalidate_company("Microsoft Corporation")
    
    # 2. Assembles workflow state
    state = {
        "company_name": "Microsoft Corporation"
    }
    
    # 3. Compile and execute entry node
    wf = create_workflow()
    print("Running entry node...")
    
    # Run entry node directly
    res = await wf.nodes["entry"].runnable.ainvoke(state)
    
    print("\n--- ENTRY NODE RESULT ---")
    print(f"Workflow Status: {res.get('workflow_status')}")
    print(f"Missing Fields Count: {len(res.get('missing_fields', []))}")
    print(f"Stale Fields Count: {len(res.get('stale_fields', []))}")
    print(f"Section Contexts Fetched Keys: {list(res.get('section_contexts', {}).keys())}")
    
    # 4. Check coverage of the field cache
    cov = field_cache.coverage_report("Microsoft Corporation")
    print(f"\nField Cache Coverage Report: {cov['filled']}/{cov['total']} fields cached ({cov['pct']}%).")
    
    # 5. Let's see some sample cached fields with their saved_at timestamps
    cached = field_cache.get_cached_fields("Microsoft Corporation")
    sample_keys = [
        "overview.office_locations",
        "financials_stability.valuation",
        "financials_stability.cac",
        "tech_innovation.r_and_d_investment"
    ]
    print("\nSample Cached Fields:")
    for k in sample_keys:
        val = cached.get(k)
        if val is not None:
            print(f"  {k}: value={str(val)[:50]!r}")
        else:
            print(f"  {k}: Not in cache")

if __name__ == "__main__":
    asyncio.run(main())
