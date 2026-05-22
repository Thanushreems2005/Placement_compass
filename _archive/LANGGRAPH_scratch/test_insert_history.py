from supabase import create_client
import os

def main():
    url = "https://jytithbexyzlnkjyufit.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY"
    
    supabase = create_client(url, key)
    
    tables_to_test = ["workflow_history", "company_history", "audit_history"]
    
    try:
        res = supabase.table("company_history").insert({}).execute()
        print("\nSuccess! Table columns:")
        if res.data:
            print(list(res.data[0].keys()))
            # Clean up the test row
            row_id = res.data[0].get("id")
            if row_id:
                supabase.table("company_history").delete().eq("id", row_id).execute()
                print("Cleaned up test row.")
        else:
            print("No data returned.")
    except Exception as e:
        print(f"Error inserting: {e}")

if __name__ == "__main__":
    main()
