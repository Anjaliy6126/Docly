"""
Owns the single global in-memory FAISS vector store for indexed documents.

Why a module-level store:
Indexing is expensive (PDF extraction, embedding, FAISS insertion), and the
store must survive between requests. A module-level instance is created once
at import time and reused everywhere. This is intentionally an intermediate
architecture — disk persistence and per-user stores come later.
"""

from app.services.vector_store import FAISSVectorStore

# Initialized once when the backend starts; shared by indexing and retrieval.
document_vector_store = FAISSVectorStore()
