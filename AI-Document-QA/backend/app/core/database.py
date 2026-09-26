from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. Please configure .env")

# create_engine establishes the connection pool to the database
engine = create_engine(settings.DATABASE_URL)

# SessionLocal is a factory for creating database sessions (transactions)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all our models (User, Document, etc.) to inherit from
Base = declarative_base()

# Dependency to get a database session for each incoming request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        # Closes the session and returns the connection to the pool after the request finishes
        db.close()
