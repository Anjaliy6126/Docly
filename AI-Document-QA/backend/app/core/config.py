import os
from typing import Optional

from dotenv import load_dotenv

# Load variables from .env file into the environment
load_dotenv()

def _env_int(name: str, default: int) -> int:
    """Reads an integer env var, failing with a clear message on bad input."""
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return int(raw)
    except ValueError:
        raise ValueError(f"{name} must be an integer, got {raw!r}.")

class Settings:
    PROJECT_NAME: str = "AI Document Q&A System API"
    PROJECT_VERSION: str = "0.1.0"
    
    # Read the PostgreSQL URL from the environment
    # If not found in .env, it will be None and the application will fail safely
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # ── JWT authentication (consumed by app/core/security.py) ────────────
    # The secret is NEVER hard-coded here — it must come from the environment
    # (see .env.example). It stays None when unset so that issuing or
    # verifying a token fails with an actionable error instead of silently
    # signing with a guessable default.
    JWT_SECRET: Optional[str] = os.getenv("JWT_SECRET")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = _env_int(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30
    )

settings = Settings()
