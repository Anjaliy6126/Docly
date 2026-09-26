import os
from dotenv import load_dotenv

# Load variables from .env file into the environment
load_dotenv()

class Settings:
    PROJECT_NAME: str = "AI Document Q&A System API"
    PROJECT_VERSION: str = "0.1.0"
    
    # Read the PostgreSQL URL from the environment
    # If not found in .env, it will be None and the application will fail safely
    DATABASE_URL: str = os.getenv("DATABASE_URL")

settings = Settings()
