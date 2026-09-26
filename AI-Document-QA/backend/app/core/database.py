import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables (if any)
load_dotenv()

# Use DATABASE_URL from .env or fallback to a local SQLite db for initial testing
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")

# For SQLite, check_same_thread=False is needed. For Postgres, connect_args is empty.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
