import os
from dotenv import load_dotenv

# Authoritatively load LANGGRAPH/.env at package initialization 
# so that tracing and key parameters are registered before any LangChain imports occur.
package_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(package_dir, ".env")
load_dotenv(env_path)
