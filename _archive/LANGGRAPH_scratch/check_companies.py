from supabase import create_client

def main():
    url = "https://jytithbexyzlnkjyufit.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY"
    
    supabase = create_client(url, key)
    
    try:
        res = supabase.table("companies").select("*").limit(1).execute()
        print("companies columns:")
        if res.data:
            print(list(res.data[0].keys()))
            print("\nSample Data:")
            print(res.data[0])
        else:
            print("Table is empty.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
