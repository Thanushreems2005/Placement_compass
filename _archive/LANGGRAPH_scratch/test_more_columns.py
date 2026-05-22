from supabase import create_client

def main():
    url = "https://jytithbexyzlnkjyufit.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY"
    
    supabase = create_client(url, key)
    
    possible_columns = [
        "history", "history_timeline", "timeline", "json", "json_data", 
        "details", "info", "record", "run", "run_data", "event", 
        "log", "logs", "audit", "content", "payload", "value", 
        "values", "summary", "text", "description", "company_history"
    ]
    
    print("Probing more columns for 'company_history'...")
    for col in possible_columns:
        try:
            val = "test"
            if col in ["json", "json_data", "details", "info", "record", "run_data", "payload", "metadata"]:
                val = {}
            res = supabase.table("company_history").insert({col: val}).execute()
            print(f"  Column '{col}': EXIST (Succeeded or RLS)")
        except Exception as e:
            err_msg = str(e)
            if "Could not find the" in err_msg and "column" in err_msg:
                pass
            else:
                print(f"  Column '{col}': EXIST (Error: {err_msg[:80]})")

if __name__ == "__main__":
    main()
