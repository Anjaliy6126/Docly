from fastapi import APIRouter, HTTPException, status

from app.schemas.rag import RAGQuestionRequest, RAGAnswerResponse
from app.services import rag_service
from app.services.demo_rag_data import demo_vector_store

router = APIRouter()

@router.post("/ask", response_model=RAGAnswerResponse)
def ask_question(request: RAGQuestionRequest) -> RAGAnswerResponse:
    """
    Answers a question using the in-memory demo RAG pipeline.

    The route stays thin: request validation is handled by Pydantic, and all
    embedding, FAISS retrieval, prompt construction, and Ollama calls live in
    the existing rag_service. The demo vector store is prepared once at
    import time (see demo_rag_data.py), not per request.
    """
    try:
        result = rag_service.answer_question_from_store(
            question=request.question,
            vector_store=demo_vector_store,
            top_k=request.top_k,
        )
    except ValueError as exc:
        # Defensive: Pydantic already validated the request, so this should
        # be rare (e.g. an invalid store state).
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except RuntimeError as exc:
        # RAG/LLM failures (Ollama down, timeout, bad response, embedding or
        # FAISS problems) surface as clear, safe messages — no stack traces.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    return RAGAnswerResponse(**result)
