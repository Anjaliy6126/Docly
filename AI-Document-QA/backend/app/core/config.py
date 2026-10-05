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

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Settings:
    PROJECT_NAME: str = "AI Document Q&A System API"
    PROJECT_VERSION: str = "0.1.0"
    
    # Read the PostgreSQL URL from the environment
    # If not found in .env, it will be None and the application will fail safely
    # Normalize postgres:// scheme (standard on Render/Heroku) to postgresql:// for SQLAlchemy 2.0 compatibility
    _raw_db_url: Optional[str] = os.getenv("DATABASE_URL")
    DATABASE_URL: Optional[str] = (
        _raw_db_url.replace("postgres://", "postgresql://", 1)
        if _raw_db_url and _raw_db_url.startswith("postgres://")
        else _raw_db_url
    )

    # ── Storage configuration ───────────────────────────────────────────
    # Centralized storage paths for uploaded PDFs and the FAISS vector index.
    # Defaults preserve local development behavior (backend/documents and backend/vector_store).
    # In production Docker deployments, these can be pointed to a persistent volume (e.g. /app/storage/...).
    DOCUMENTS_DIR: str = os.getenv(
        "DOCUMENTS_DIR", os.path.join(BACKEND_DIR, "documents")
    )
    VECTOR_STORE_DIR: str = os.getenv(
        "VECTOR_STORE_DIR", os.path.join(BACKEND_DIR, "vector_store")
    )

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
