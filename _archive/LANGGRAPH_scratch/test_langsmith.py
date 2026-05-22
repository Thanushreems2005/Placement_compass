import os
import logging
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestLangSmith")

# Load environment
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(current_dir, ".env")
load_dotenv(env_path)

print("=== LANGSMITH ENV VARS ===")
print("LANGCHAIN_TRACING_V2:", os.getenv("LANGCHAIN_TRACING_V2"))
print("LANGCHAIN_ENDPOINT:", os.getenv("LANGCHAIN_ENDPOINT"))
print("LANGCHAIN_API_KEY:", os.getenv("LANGCHAIN_API_KEY"))
print("LANGCHAIN_PROJECT:", os.getenv("LANGCHAIN_PROJECT"))

try:
    from langsmith import Client
    client = Client()
    # Try to list projects to verify authentication!
    projects = list(client.list_projects())
    print("\n[SUCCESS] Successfully authenticated with LangSmith!")
    print("Available Projects:")
    for p in projects:
        print(f" - {p.name} (ID: {p.id})")
except Exception as e:
    print(f"\n[ERROR] Failed to authenticate with LangSmith: {e}")
