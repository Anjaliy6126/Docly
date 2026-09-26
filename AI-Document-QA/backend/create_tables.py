import os
import sys

# Ensure backend directory is in the path so imports work correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import inspect
from app.core.database import Base, engine

# Import all models so SQLAlchemy knows about them before calling create_all
from app.models.user import User
from app.models.document import Document
from app.models.chat import Chat, chat_documents
from app.models.message import Message

def create_tables():
    print("Creating database tables...")
    
    # create_all is safe to run multiple times. It only creates tables that don't exist.
    Base.metadata.create_all(bind=engine)
    
    print("Database tables created successfully!")
    
    # Verify created tables
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    print("\nExisting tables in the database:")
    for table_name in table_names:
        print(f" - {table_name}")

if __name__ == "__main__":
    create_tables()
