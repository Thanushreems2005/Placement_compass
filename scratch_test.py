import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
EMAIL = "test_arena_student@example.com"
PASSWORD = "SecurePassword123"

def run_tests():
    print("Step 1: Attempting to register test user...")
    reg_payload = {
        "email": EMAIL,
        "password": PASSWORD,
        "role": "student"
    }
    
    try:
        res = requests.post(f"{BASE_URL}/auth/register", json=reg_payload)
        if res.status_code == 200:
            print("Successfully registered brand new test user!")
        elif res.status_code == 400:
            print("User already exists or bad request (proceeding to login).")
        else:
            print(f"Register status: {res.status_code}, detail: {res.text}")
    except Exception as e:
        print(f"Register request failed: {e}")

    print("\nStep 2: Authenticating user to retrieve token...")
    login_payload = {
        "username": EMAIL,
        "password": PASSWORD
    }
    try:
        res = requests.post(f"{BASE_URL}/auth/login", data=login_payload)
        if res.status_code == 200:
            token = res.json()["access_token"]
            print("Token successfully retrieved!")
            
            print("\nStep 3: Querying Arena questions for Level 1 using JWT token...")
            headers = {
                "Authorization": f"Bearer {token}"
            }
            res_q = requests.get(f"{BASE_URL}/arena/questions?level=1", headers=headers)
            print(f"Status Code: {res_q.status_code}")
            if res_q.status_code == 200:
                data = res_q.json()
                print("Level 1 questions fetched successfully!")
                print(f"Level: {data.get('level')}")
                print(f"Derived topics count: {len(data.get('derived_level_topics', []))}")
                print(f"Questions returned count: {len(data.get('questions', []))}")
                
                first_q = data.get('questions')[0]
                print(f"\nFirst Question details:")
                print(f"ID: {first_q.get('id')}")
                print(f"Topic: {first_q.get('topic')}")
                print(f"Type: {first_q.get('type')}")
                print(f"Snippet: {first_q.get('text')[:120]}...")
            else:
                print(f"Failed to fetch questions: {res_q.text}")
        else:
            print(f"Login failed: {res.status_code}, response: {res.text}")
    except Exception as e:
        print(f"Login request failed: {e}")

if __name__ == "__main__":
    run_tests()
