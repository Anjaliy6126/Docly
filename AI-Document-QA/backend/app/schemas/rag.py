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

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("question must be a non-empty string.")
        return value

class RAGSource(BaseModel):
    """One retrieved document chunk with its similarity score."""
    document_id: int
    page_number: int
    chunk_index: int
    text: str
    score: float

class RAGAnswerResponse(BaseModel):
    """RAG answer plus the sources it was grounded in. Embeddings are never exposed."""
    answer: str
    sources: list[RAGSource]
