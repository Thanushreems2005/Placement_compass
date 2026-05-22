from supabase import create_client

def main():
    url = "https://jytithbexyzlnkjyufit.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGl0aGJleHl6bG5ranl1Zml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDM3MzQsImV4cCI6MjA5MjE3OTczNH0.Q_wtjr1OT0rysXLhSTGrwHyXdACKnpCt1dkhzLH3_yY"
    
    supabase = create_client(url, key)
    
    possible_columns = [
        'company_id', 'name', 'short_name', 'category', 'incorporation_year', 
        'nature_of_company', 'headquarters_address', 'office_count', 'employee_size', 
        'website_url', 'linkedin_url', 'twitter_handle', 'facebook_url', 'instagram_url', 
        'primary_contact_email', 'primary_phone_number', 'overview_text', 
        'vision_statement', 'mission_statement', 'legal_issues', 'carbon_footprint',
        'updated_at', 'run_id', 'metadata', 'history_id'
    ]
    
    print("Probing columns for 'company_history'...")
    for col in possible_columns:
        try:
            val = "test"
            if col in ["metrics", "quality", "data", "metadata"]:
                val = {}
            elif col in ["company_id", "incorporation_year", "office_count", "employee_size", "progress_percentage"]:
                val = 1
            
            res = supabase.table("company_history").insert({col: val}).execute()
            print(f"  Column '{col}': EXIST (Succeeded or RLS)")
        except Exception as e:
            err_msg = str(e)
            if "Could not find the" in err_msg and "column" in err_msg:
                print(f"  Column '{col}': DOES NOT EXIST")
            else:
                # If it's an RLS violation, the column exists!
                print(f"  Column '{col}': EXIST (Error: {err_msg[:80]})")

if __name__ == "__main__":
    main()
