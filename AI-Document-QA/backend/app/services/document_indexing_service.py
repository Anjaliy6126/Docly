import os
import logging
from typing import Dict, Any

from app.services.pdf_extractor import extract_text_from_pdf
from app.services.text_chunker import chunk_document_pages
from app.services.chunk_embedding_service import embed_chunks
from app.services.document_vector_store import document_vector_store

logger = logging.getLogger(__name__)

# Same upload directory logic as app/api/routes/documents.py:
# this file lives at backend/app/services/, so four dirname() steps
# reach backend/, where the shared documents/ upload folder lives.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
UPLOAD_DIR = os.path.join(BASE_DIR, "documents")

def resolve_stored_pdf_path(stored_filename: str) -> str:
    """
    Resolves the absolute path of a stored PDF inside the shared upload
    directory, protecting against path traversal.

    Why the traversal check matters:
    stored_filename comes from the database. If it were ever tampered with
    (e.g. "..\\..\\secret.txt"), blindly joining it onto UPLOAD_DIR could
    read files outside the upload folder. Uploads always store a generated
    UUID filename, so anything containing a separator is rejected outright.
    """
    if not isinstance(stored_filename, str) or not stored_filename.strip():
        raise ValueError("Document has no stored filename.")
    if (
        os.path.basename(stored_filename) != stored_filename
        or stored_filename in (".", "..")
        or os.path.sep in stored_filename
        or "/" in stored_filename
    ):
        raise ValueError("stored_filename contains invalid path characters.")

    path = os.path.join(UPLOAD_DIR, stored_filename)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Stored PDF file '{stored_filename}' was not found in the upload directory."
        )
    return path

def index_document(document: Any) -> Dict[str, Any]:
    """
    Indexes one uploaded document into the global FAISS vector store.

    Pipeline:
    Document record -> stored PDF -> page text -> chunks -> embeddings -> FAISS

    Reuses the existing services (extract_text_from_pdf, chunk_document_pages,
    embed_chunks, FAISSVectorStore) — nothing here duplicates their logic.

    Returns:
        {
            "document_id": <document.id>,
            "pages_processed": <number of extracted pages>,
            "chunks_created": <number of chunks after chunking>,
            "chunks_indexed": <number of vectors added to FAISS>
        }
    """
    if document is None or getattr(document, "id", None) is None:
        raise ValueError("A valid document record with an id is required.")

    stored_filename = getattr(document, "stored_filename", None)
    pdf_path = resolve_stored_pdf_path(stored_filename)

    # 1. Extract page text (raises clearly on invalid/corrupt PDFs).
    pages = extract_text_from_pdf(pdf_path)

    # 2. Chunk the pages. chunk_document_pages skips empty pages and keeps a
    #    single running chunk_index across the whole document (it is NOT
    #    reset per page), which is exactly the citation behavior we need.
    chunks = chunk_document_pages(document.id, pages)
    if not chunks:
        raise RuntimeError(
            f"Document {document.id} contains no usable text to index "
            "(all pages are empty)."
        )

    # 3. Attach 384-dim embeddings to every chunk.
    try:
        embedded_chunks = embed_chunks(chunks)
    except Exception as exc:
        raise RuntimeError(f"Embedding failed for document {document.id}: {exc}")

    # 4. Add the embedded chunks (vectors + preserved metadata) to FAISS.
    try:
        document_vector_store.add_chunks(embedded_chunks)
    except Exception as exc:
        raise RuntimeError(f"Vector store indexing failed for document {document.id}: {exc}")

    result = {
        "document_id": document.id,
        "pages_processed": len(pages),
        "chunks_created": len(chunks),
        "chunks_indexed": len(embedded_chunks),
    }
    logger.info(f"Indexed document {document.id}: {result}")
    return result
