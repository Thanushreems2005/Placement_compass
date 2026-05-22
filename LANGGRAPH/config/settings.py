import os
from typing import Optional
from dotenv import load_dotenv
from loguru import logger

# Load .env file from the current directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)


class Settings:
    """
    Centralized configuration management for the LangGraph platform.
    Validates existence of required keys on initialization.
    """

    def __init__(self):
        # API Keys
        self.GROQ_API_KEY = self._get_required("GROQ_API_KEY")
        self.OPENROUTER_API_KEY = self._get_required("OPENROUTER_API_KEY")
        self.GEMINI_API_KEY = self._get_required("GEMINI_API_KEY")
        self.CEREBRAS_API_KEY = self._get_required("CEREBRAS_API_KEY")
        
        # Optional API Keys
        self.TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "")
        self.ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

        # Supabase
        self.SUPABASE_URL = self._get_required("VITE_SUPABASE_URL")
        self.SUPABASE_ANON_KEY = self._get_required("VITE_SUPABASE_ANON_KEY")
        self.SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY", ""))
        self.SUPABASE_KEY = self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_ANON_KEY
        self.SUPABASE_WRITE_ENABLED = bool(self.SUPABASE_SERVICE_ROLE_KEY)

        # Application Metadata
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        self.DEV_MODE = os.getenv("DEV_MODE", "false").lower() == "true"
        self.PERSIST_IN_DEV = os.getenv("PERSIST_IN_DEV", "false").lower() == "true"
        self.MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "140"))
        self.CONCURRENCY_LIMIT = int(os.getenv("CONCURRENCY_LIMIT", "3"))
        self.ENABLE_OPENROUTER = os.getenv("ENABLE_OPENROUTER", "true").lower() == "true"

    def _get_required(self, key: str) -> str:
        """Helper to fetch a required env var or raise an error."""
        value = os.getenv(key)
        if not value:
            logger.error(f"CRITICAL: Missing required environment variable '{key}'")
            raise ValueError(f"Missing required environment variable '{key}'. Please check your .env file.")
        return value


# Singleton instance for global access
try:
    settings = Settings()
    logger.info(f"Configuration loaded successfully for environment: {settings.ENVIRONMENT}")
except ValueError as e:
    # We allow the instance to fail if we are just importing it for tests or builds,
    # but in a real run, this will halt the application.
    logger.warning("Settings initialization failed. Some modules may not function correctly.")
    settings = None
