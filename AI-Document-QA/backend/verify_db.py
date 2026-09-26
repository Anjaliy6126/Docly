import sys
import os

# Add the 'backend' directory to sys.path so 'app' can be imported properly
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import Base, engine
# Import all models so they register with Base.metadata
from app.models import User, Document, Chat, Message

def verify_models():
    print("Verifying SQLAlchemy Models...")
    try:
        # Create all tables in the SQLite test database to ensure models are valid
        Base.metadata.create_all(bind=engine)
        print("Success! All models imported and tables created successfully.")
        
        # Verify the tables exist in the metadata
        tables = list(Base.metadata.tables.keys())
        print(f"Created Tables: {tables}")
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify_models()
