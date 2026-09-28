from typing import List

from pydantic import BaseModel, Field, field_validator

class ChatCreateRequest(BaseModel):
    """Request body for creating a new chat with selected documents."""

    title: str = Field(
        min_length=1,
        max_length=200,
        description="Chat title (1-200 characters after trimming whitespace)."
    )
    document_ids: List[int] = Field(
        min_length=1,
        description="At least one existing document ID must be selected."
    )

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title must be a non-empty string.")
        return trimmed

    @field_validator("document_ids")
    @classmethod
    def document_ids_must_be_positive(cls, value: List[int]) -> List[int]:
        if any(not isinstance(d, int) or d < 1 for d in value):
            raise ValueError("document_ids must contain positive integer document IDs.")
        # Remove duplicates while preserving the order the user provided.
        return list(dict.fromkeys(value))

class ChatResponse(BaseModel):
    """A created chat with its associated document IDs. Messages come later."""
    id: int
    title: str
    document_ids: List[int]
    created_at: str
    updated_at: str
