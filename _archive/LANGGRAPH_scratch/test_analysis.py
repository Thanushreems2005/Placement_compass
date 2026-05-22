import asyncio
import os
import sys

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set early env load
from LANGGRAPH import __init__
from LANGGRAPH.graph.workflow import app as graph_app

async def main():
    # Force DEV_MODE to true to skip persistent DB saves during local testing
    os.environ["DEV_MODE"] = "true"
    
    print("Running full LangGraph execution for Microsoft Corporation...")
    
    initial_state = {
        "company_name": "Microsoft Corporation",
        "company_id": "test-cli-run"
    }
    
    final_state = await graph_app.ainvoke(initial_state)
    
    print("\n--- FINAL WORKFLOW RESULTS ---")
    print(f"Status: {final_state.get('workflow_status')}")
    print(f"Completeness Score: {final_state.get('completeness_score')}%")
    print(f"Quality Score: {final_state.get('quality_score')}%")
    
    analysis = final_state.get("analysis_data")
    print("\n--- ENTERPRISE INTELLIGENCE ANALYSIS RESULTS ---")
    if analysis:
        for k, v in sorted(analysis.items()):
            print(f"  {k}: {str(v)[:100]}...")
    else:
        print("  NO ANALYSIS DATA GENERATED!")

if __name__ == "__main__":
    asyncio.run(main())
