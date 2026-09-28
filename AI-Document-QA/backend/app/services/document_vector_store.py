"""
Owns the single global FAISS vector store for indexed documents.

Why a module-level store:
Indexing is expensive (PDF extraction, embedding, FAISS insertion), and the
store must survive between requests. A module-level instance is created once
at import time and reused everywhere.

Persistence:
The store is backed by the backend/vector_store/ directory (index.faiss +
metadata.json, both gitignored). On startup the persisted files are loaded
automatically, so an application restart does NOT lose the index and does
NOT need to re-extract/re-embed any PDFs. If no files exist yet (first run)
the store simply starts empty — that is normal, not an error. If the files
exist but are corrupted or inconsistent, a clear error is logged and the
store starts empty rather than pretending invalid vectors are usable.
"""

import logging
import os

from app.services.vector_store import FAISSVectorStore

logger = logging.getLogger(__name__)

# This file lives at backend/app/services/, so three dirname() steps reach
# backend/ — the persistent store lives in backend/vector_store/ (gitignored).
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VECTOR_STORE_DIR = os.path.join(BACKEND_DIR, "vector_store")

def _create_persistent_store() -> FAISSVectorStore:
    """
    Creates the global store, loading persisted vectors when available.

    A corrupted persisted store is logged loudly and replaced with an empty
    store: the application still boots, and the next document indexing
    rebuilds the files. Searches can never return wrong results because an
    empty store raises the normal "Vector store is empty." error.
    """
    try:
        return FAISSVectorStore(persist_directory=VECTOR_STORE_DIR)
    except RuntimeError as exc:
        logger.error(
            f"Persisted vector store could not be loaded and was reset to empty. "
            f"Re-index your documents to rebuild it. Reason: {exc}"
        )
        return FAISSVectorStore()

# Initialized once when the backend starts; shared by indexing and retrieval.
document_vector_store: FAISSVectorStore = _create_persistent_store()
