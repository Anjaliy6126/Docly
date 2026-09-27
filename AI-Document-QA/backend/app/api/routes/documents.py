import os
import uuid
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentTextResponse
from app.services.pdf_extractor import extract_text_from_pdf
from app.api.deps import get_current_dev_user
from app.models.user import User

router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

# Path to backend/documents
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOAD_DIR = os.path.join(BASE_DIR, "documents")

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    # 1. Validate extension and content type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid content type. Expected application/pdf.")

    # 2. Check size (move cursor to end, get size, move back)
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max allowed is {MAX_FILE_SIZE // (1024*1024)} MB.")
    file.file.seek(0)

    # 3. Create upload directory if it doesn't exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # 4. Generate unique filename for safe filesystem storage
    unique_filename = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # 5. Save physical file safely
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save file to disk.")
        
    title = os.path.splitext(file.filename)[0]
    
    # 6. Create Database Record
    new_doc = Document(
        owner_id=current_user.id,
        original_filename=file.filename,
        stored_filename=unique_filename,
        title=title,
        file_size=file_size,
        # status defaults to 'uploaded' automatically from our SQLAlchemy model
    )
    
    try:
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
    except Exception as e:
        # Rollback DB and remove physical file to prevent orphans
        db.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Database insertion failed.")

    return new_doc

@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    # Return documents owned by the current dev user, newest first
    docs = db.query(Document).filter(Document.owner_id == current_user.id).order_by(Document.upload_timestamp.desc()).all()
    return docs

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    # Ensure the user can only fetch their own document
    doc = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    # Find document safely checking ownership
    doc = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    
    file_path = os.path.join(UPLOAD_DIR, doc.stored_filename)
    
    # Delete from database first
    try:
        db.delete(doc)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete database record.")
        
    # Delete the physical file safely
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            # File system error shouldn't crash the API if DB delete succeeded,
            # but ideally logged. For now we pass safely.
            pass
            
    return None

@router.get("/{document_id}/text", response_model=DocumentTextResponse)
def get_document_text(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    # Ensure the user can only fetch their own document
    doc = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    file_path = os.path.join(UPLOAD_DIR, doc.stored_filename)

    # Extract text from the PDF
    try:
        pages_data = extract_text_from_pdf(file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Physical PDF file not found on disk.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while extracting text from the PDF.")

    return DocumentTextResponse(
        document_id=doc.id,
        filename=doc.original_filename,
        pages=pages_data
    )
