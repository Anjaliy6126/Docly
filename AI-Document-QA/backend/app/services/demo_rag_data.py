"""
Temporary demo dataset for the RAG API.

Why this exists:
Persistent document indexing (upload -> chunk -> embed -> index) is not
implemented yet. To prove the API integration works end to end, we prepare
a tiny in-memory dataset once at import time and reuse it for every request.

This is temporary architecture: it will be replaced by proper
document-based indexing in a later prompt.
"""

from app.services.chunk_embedding_service import embed_chunks
from app.services.rag_service import build_vector_store
from app.services.vector_store import FAISSVectorStore

DEMO_CHUNKS = [
    {
        "document_id": 1,
        "page_number": 1,
        "chunk_index": 0,
        "text": "Students must maintain a minimum attendance of 75 percent.",
    },
    {
        "document_id": 1,
        "page_number": 2,
        "chunk_index": 1,
        "text": "Students can register for examinations after completing the required academic requirements.",
    },
    {
        "document_id": 1,
        "page_number": 3,
        "chunk_index": 2,
        "text": "The college library remains open from 9 AM to 5 PM.",
    },
]

# Embed the demo chunks once (via the existing chunk embedding service).
_embedded_demo_chunks = embed_chunks(DEMO_CHUNKS)

# Build the FAISS vector store once at import time. add_chunks() copies chunk
# data internally, so the embedded list is never mutated afterwards and can
# be safely reused for every request.
demo_vector_store: FAISSVectorStore = build_vector_store(_embedded_demo_chunks)
