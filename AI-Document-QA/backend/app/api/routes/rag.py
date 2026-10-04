from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.document import Document
from app.models.user import User
from app.schemas.rag import RAGQuestionRequest, RAGAnswerResponse
from app.services import rag_service
from app.services.document_vector_store import document_vector_store

router = APIRouter()


def _owned_document_ids(
    requested: Optional[List[int]],
    owner_id: int,
    db: Session,
) -> List[int]:
    """
    Resolves the document ids a caller is allowed to search.

    FAISS itself has no notion of ownership — document_ids is the only thing
    that keeps retrieval inside one user's data — so every caller-supplied
    list is intersected with the caller's own documents before it reaches the
    vector store.

    - requested is None  -> every document the caller owns (never "all users")
    - requested is []    -> no documents, which triggers the grounded fallback
    - requested has ids  -> only those that exist AND belong to the caller;
                            anything else is a 404, worded identically for
                            "does not exist" and "owned by someone else" so
                            ownership cannot be probed
    """
    query = db.query(Document.id).filter(Document.owner_id == owner_id)
    if requested is not None:
        query = query.filter(Document.id.in_(requested))
    owned = [row[0] for row in query.all()]

    if requested:
        missing = set(requested) - set(owned)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found.",
            )
    return owned


@router.post("/ask", response_model=RAGAnswerResponse)
def ask_question(
    request: RAGQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RAGAnswerResponse:
    """
    Answers a question against the caller's own indexed documents.

    The route stays thin: request validation is handled by Pydantic, and all
    embedding, FAISS retrieval, prompt construction, and Ollama calls live in
    the existing rag_service. Retrieval uses the global document vector store
    (populated by document_indexing_service when documents are indexed).

    Ownership: the store is shared by every user, so the requested document
    ids are resolved against the authenticated user FIRST. With no
    document_ids supplied the search covers everything the caller owns —
    never every user's vectors.

    After retrieval, document filenames are resolved from the database in a
    single batch query (no N+1) and stamped onto the source list before the
    response is serialized.
    """
    document_ids = _owned_document_ids(request.document_ids, current_user.id, db)

    try:
        result = rag_service.answer_question_from_store(
            question=request.question,
            vector_store=document_vector_store,
            top_k=request.top_k,
            document_ids=document_ids,
        )
    except ValueError as exc:
        # Defensive: Pydantic already validated the request, so this should
        # be rare (e.g. an invalid store state).
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except RuntimeError as exc:
        # RAG/LLM failures (Ollama down, timeout, bad response, embedding or
        # FAISS problems) surface as clear, safe messages — no stack traces.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    # Resolve document filenames in ONE query to avoid N+1. Re-asserting
    # ownership here means a source can never name another user's file.
    sources = result.get("sources", [])
    if sources:
        unique_ids = list({s["document_id"] for s in sources})
        docs = (
            db.query(Document)
            .filter(Document.id.in_(unique_ids), Document.owner_id == current_user.id)
            .all()
        )
        name_map = {doc.id: doc.original_filename for doc in docs}
        rag_service.resolve_document_names(sources, name_map)

    return RAGAnswerResponse(**result)
