import asyncio
import sys
import os
import time
import logging
from dotenv import load_dotenv

# Ensure project root and LANGGRAPH are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)
if current_dir not in sys.path:
    sys.path.append(current_dir)

load_dotenv(os.path.join(current_dir, ".env"))

# Windows stdout encoding reconfig to prevent CP1252 print crashes
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Configure logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("BatchRunner")

from LANGGRAPH.services.supabase_service import SupabaseClient
from app.service.workflow_service import WorkflowService
from app.models.runtime import RuntimeStatus

async def main():
    print("==================================================")
    print("🚀 STARTING BATCH PROCESSING FOR ALL 140 COMPANIES")
    print("==================================================")
    
    # 1. Initialize services
    try:
        db = SupabaseClient()
        service = WorkflowService()
    except Exception as e:
        print(f"[-] Failed to initialize database client or workflow service: {e}")
        return
        
    # 2. Retrieve all companies from primary DB
    print("[*] Retrieving company directory from Supabase...")
    try:
        res = db.client.table("companies").select("name, company_id").order("company_id").execute()
        if not res.data:
            print("[-] No companies found in the database table.")
            return
        companies = res.data
        total_companies = len(companies)
        print(f"[+] Found {total_companies} companies to process.")
    except Exception as e:
        print(f"[-] Database query failed: {e}")
        return

    # 3. Process loop
    processed_count = 0
    success_count = 0
    failed_count = 0
    start_time = time.time()
    
    for idx, comp in enumerate(companies):
        name = comp.get("name")
        comp_id = comp.get("company_id")
        
        print(f"\n--- [ BATCH COMPANY {idx+1} / {total_companies} ] [{name}] [ID: {comp_id}] ---")
        
        comp_start = time.time()
        try:
            # Run the extraction/validation/consolidation workflow
            result = await service.execute_research(name, company_id=comp_id)
            
            comp_elapsed = time.time() - comp_start
            processed_count += 1
            
            if result.status not in (RuntimeStatus.FAILED,):
                success_count += 1
                prov = result.quality.provenance or {}
                cached = prov.get("cache_verified", 0)
                extracted = prov.get("real_extracted", 0)
                consensus = prov.get("validated_consensus", 0)
                
                print(f"[+] SUCCESS: {name}")
                print(f"    - Elapsed Time: {comp_elapsed:.1f}s")
                print(f"    - Completeness: {result.quality.completeness_score:.1f}%")
                print(f"    - Confidence:   {result.quality.quality_score:.1f}%")
                print(f"    - Cache Hits:   {cached} / 163 fields")
                print(f"    - New Extracted: {extracted} fields")
                print(f"    - Consensus:    {consensus} fields")
            else:
                failed_count += 1
                print(f"[-] FAILED: {name} | Error: {result.error or 'Workflow failure'}")
                
        except Exception as ex:
            failed_count += 1
            processed_count += 1
            print(f"[-] EXCEPTION: {name} | Error: {ex}")
            
        # Small cooldown between companies to prevent rate-limit bursts
        await asyncio.sleep(0.5)

    # 4. Final summary metrics
    total_elapsed = time.time() - start_time
    print("\n==================================================")
    print("📊 BATCH PROCESS COMPLETE SUMMARY")
    print("==================================================")
    print(f"  - Total Companies:       {total_companies}")
    print(f"  - Processed:             {processed_count}")
    print(f"  - Success:               {success_count}")
    print(f"  - Failed:                {failed_count}")
    print(f"  - Total Duration:        {total_elapsed/60:.1f} minutes")
    print(f"  - Average Time/Company:  {total_elapsed/max(1, processed_count):.1f} seconds")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
