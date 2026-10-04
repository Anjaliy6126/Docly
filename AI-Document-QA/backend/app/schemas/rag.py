from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

class RAGQuestionRequest(BaseModel):
    """Request body for asking a question against the RAG pipeline."""

    question: str
    top_k: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of document chunks to retrieve (1-10)."
    )
    document_ids: Optional[List[int]] = Field(
        default=None,
        description=(
            "Optional list of document IDs to restrict the search to. "
            "None searches all indexed documents. An empty list means no "
            "documents are selected (never searches everything)."
        )
    )

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("question must be a non-empty string.")
        return value

    @field_validator("document_ids")
    @classmethod
    def document_ids_must_be_positive(cls, value: Optional[List[int]]) -> Optional[List[int]]:
        if value is not None and any(not isinstance(d, int) or d < 1 for d in value):
            raise ValueError("document_ids must contain positive integer document IDs.")
        return value

class RAGSource(BaseModel):
    """One retrieved document chunk with its similarity score."""
    document_id: int
    # Resolved from the Document table at response time so filenames never
    # need to be duplicated inside the FAISS metadata store.
    document_name: Optional[str] = None
    page_number: int
    chunk_index: int
    text: str
    score: float

class RAGAnswerResponse(BaseModel):
    """RAG answer plus the sources it was grounded in. Embeddings are never exposed."""
    answer: str
    sources: list[RAGSource]
