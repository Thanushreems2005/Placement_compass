from supabase import create_client

def main():
    url = "https://jytithbexyzlnkjyufit.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY"
    
    supabase = create_client(url, key)
    
    tables = [
        "companies", "company", "company_history", "audit_history", "company_json", 
        "innovx_json", "job_role_details_json", "company_financials", 
        "company_culture", "company_technology", "company_logistics", 
        "company_leadership", "company_brand", "company_growth"
    ]
    
    print("Checking which tables exist...")
    for tbl in tables:
        try:
            res = supabase.table(tbl).select("*").limit(1).execute()
            print(f"  - {tbl}: EXISTS (Row count: {len(res.data)})")
        except Exception as e:
            err_msg = str(e)
            if "Could not find the table" in err_msg or "does not exist" in err_msg:
                print(f"  - {tbl}: DOES NOT EXIST")
            else:
                print(f"  - {tbl}: EXISTS (Error: {err_msg[:60]})")

if __name__ == "__main__":
    main()
