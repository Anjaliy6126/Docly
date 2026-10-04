import logging
import os
import uuid
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.document import Document, ProcessingStatus
from app.schemas.document import DocumentResponse, DocumentTextResponse, DocumentChunk
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.text_chunker import chunk_document_pages
from app.services.document_indexing_service import index_document
from app.services.document_vector_store import document_vector_store
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

# Path to backend/documents
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOAD_DIR = os.path.join(BASE_DIR, "documents")

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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

    # 7. Index the document synchronously (no background workers yet).
    #    The existing index_document() pipeline reuses PDF extraction,
    #    chunking, embedding, and FAISS insertion + persistence — nothing
    #    is duplicated here. It happens exactly once per upload, so no
    #    duplicate vectors are created by this flow.
    new_doc.status = ProcessingStatus.processing
    db.commit()

    try:
        index_document(new_doc)
    except Exception:
        # Indexing failed: mark the existing Document row as failed (no
        # duplicate rows are created) and keep the uploaded PDF so a future
        # retry mechanism can process it again.
        new_doc.status = ProcessingStatus.failed
        db.commit()
        raise HTTPException(
            status_code=500,
            detail="Document uploaded, but automatic indexing failed. "
                   "The document is saved and can be retried later.",
        )

    # Only marked processed after extraction, chunking, embedding, FAISS
    # insertion AND FAISS persistence all succeeded inside index_document().
    new_doc.status = ProcessingStatus.processed
    db.commit()
    db.refresh(new_doc)

    return new_doc

@router.get("/", response_model=list[DocumentResponse])
def get_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Return documents owned by the authenticated user, newest first
    docs = db.query(Document).filter(Document.owner_id == current_user.id).order_by(Document.upload_timestamp.desc()).all()
    return docs

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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

    # Remove this document's vectors from the persistent FAISS store as part
    # of the same delete. The database row is the authoritative record and is
    # already gone, so ordering it first means a failure here can never leave
    # an obviously inconsistent state: the store itself stays valid (index and
    # metadata are swapped together, and save() publishes both atomically),
    # and at worst a few unreachable stale vectors remain for a document that
    # no longer exists. The delete therefore still completes normally.
    try:
        removed = document_vector_store.remove_document(document_id)
        logger.info(
            f"Removed {removed} vector(s) from the store for deleted document {document_id}."
        )
    except Exception as exc:
        logger.error(
            f"Document {document_id} was deleted, but its vectors could not be "
            f"removed from the vector store: {exc}"
        )

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
    current_user: User = Depends(get_current_user)
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

@router.get("/{document_id}/chunks", response_model=list[DocumentChunk])
def get_document_chunks(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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

    # Chunk the extracted text
    try:
        chunks = chunk_document_pages(document_id=doc.id, pages=pages_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while chunking text.")

    return chunks
