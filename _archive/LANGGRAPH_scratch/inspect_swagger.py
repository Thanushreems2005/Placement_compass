import requests
import json

def main():
    url = "https://jytithbexyzlnkjyufit.supabase.co/rest/v1/"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY"
    }
    
    try:
        res = requests.get(url, headers=headers)
        swagger = res.json()
        
        print("TABLES AND COLUMNS IN DATABASE:")
        definitions = swagger.get("definitions", {})
        for table_name, definition in definitions.items():
            properties = definition.get("properties", {})
            cols = list(properties.keys())
            print(f"\n- {table_name}:")
            print(f"  Columns: {cols}")
    except Exception as e:
        print(f"Error fetching swagger: {e}")

if __name__ == "__main__":
    main()
