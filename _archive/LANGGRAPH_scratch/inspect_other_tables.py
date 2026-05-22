from supabase import create_client

def main():
    url = "https://jytithbexyzlnkjyufit.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY"
    
    supabase = create_client(url, key)
    
    tables = ["company_financials", "company_culture", "company_logistics", "company_json", "company_history"]
    for t in tables:
        try:
            res = supabase.table(t).select("*").limit(1).execute()
            print(f"\n--- {t} ---")
            if res.data:
                print("Columns:", list(res.data[0].keys()))
                print("Sample data:", res.data[0])
            else:
                print("Table is empty.")
        except Exception as e:
            print(f"Error for {t}: {e}")

if __name__ == "__main__":
    main()
