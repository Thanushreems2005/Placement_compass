import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

required = [
    "GROQ_API_KEY",
    "OPENROUTER_API_KEY",
    "GEMINI_API_KEY",
    "CEREBRAS_API_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
]

for r in required:
    val = os.getenv(r)
    print(f"{r}: {'Found (len=' + str(len(val)) + ')' if val else 'MISSING'}")
