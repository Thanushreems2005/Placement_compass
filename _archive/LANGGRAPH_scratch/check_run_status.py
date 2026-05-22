import requests
import json
import time

def main():
    # Find active runs or query the status
    url = "http://127.0.0.1:8082/v1/agent/status/87de9118-d9a0-498e-a9b9-e28c340890cf"
    try:
        res = requests.get(url)
        print("Status Code:", res.status_code)
        data = res.json()
        print("Current Stage:", data.get("current_stage"))
        print("Progress:", data.get("progress_percentage"), "%")
        print("Status:", data.get("status"))
        print("Error:", data.get("error"))
        print("Quality Report:", json.dumps(data.get("quality", {}), indent=2))
        print("Metrics Summary:", json.dumps(data.get("metrics", {}).get("token_usage", {}), indent=2))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
