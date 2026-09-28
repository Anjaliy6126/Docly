from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.api.routes import documents
from app.api.routes import rag
from app.api.routes import chats

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Backend API for the RAG-based document assistant."
)

# CORS Middleware setup to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Default Vite React port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Document Routes
app.include_router(documents.router, prefix="/documents", tags=["documents"])

# Register RAG Routes
app.include_router(rag.router, prefix="/rag", tags=["rag"])

# Register Chat Routes
app.include_router(chats.router, prefix="/chats", tags=["chats"])

@app.get("/health")
def health_check():
    """Simple health check endpoint to verify the API is running."""
    return {"status": "ok", "message": "Backend is running"}

@app.get("/health/db")
def health_check_db(db: Session = Depends(get_db)):
    """Check if the PostgreSQL database connection is working."""
    try:
        # Execute a simple SELECT 1 query
        result = db.execute(text("SELECT 1")).scalar()
        if result == 1:
            return {"status": "ok", "message": "Database connection is successful!"}
        else:
            raise HTTPException(status_code=500, detail="Database returned unexpected result.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
