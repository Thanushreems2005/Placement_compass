import sys
import os
import asyncio

# Ensure project root is in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
if project_root not in sys.path:
    sys.path.append(project_root)

from LANGGRAPH.config.settings import settings
from app.service.workflow_service import WorkflowService
from LANGGRAPH.nodes.phase4_consolidate import SCHEMA_MAP

async def main():
    service = WorkflowService()
    target_company = "Seagate Technology Holdings plc"
    result = await service.execute_research(target_company)
    
    print("\n--- DEBUG FIELD COVERAGE ---")
    if not result.data:
        print("No consolidated data found!")
        return
        
    empty_count = 0
    filled_count = 0
    
    for section_name, model_cls in SCHEMA_MAP.items():
        section_data = result.data.get(section_name) or {}
        print(f"\nSection: {section_name}")
        for field_name in model_cls.model_fields.keys():
            val = section_data.get(field_name)
            # Check if empty, None, empty list/dict
            is_empty = (val is None or val == "" or val == [] or val == {} or val == "null" or val == "None")
            
            if is_empty:
                empty_count += 1
                print(f"  [X] {field_name:<30} | Type: {model_cls.model_fields[field_name].annotation} | Value: {val}")
            else:
                filled_count += 1
                
    print(f"\nSummary:")
    print(f"  Filled: {filled_count}")
    print(f"  Empty:  {empty_count}")
    print(f"  Total:  {filled_count + empty_count}")

if __name__ == "__main__":
    asyncio.run(main())
