import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
print(f"Env path calculated: {env_path}")
print(f"Env path exists: {os.path.exists(env_path)}")

success = load_dotenv(env_path)
print(f"load_dotenv returned: {success}")

print(f"GROQ_API_KEY: {os.getenv('GROQ_API_KEY')}")
print(f"GEMINI_API_KEY: {os.getenv('GEMINI_API_KEY')}")
print(f"TAVILY_API_KEY: {os.getenv('TAVILY_API_KEY')}")
