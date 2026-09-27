from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class DocumentResponse(BaseModel):
    id: int
    original_filename: str
    title: Optional[str] = None
    category: Optional[str] = None
    file_size: Optional[int] = None
    status: str
    upload_timestamp: datetime
    updated_timestamp: datetime

    # Config to allow Pydantic to read data from SQLAlchemy ORM models
    model_config = ConfigDict(from_attributes=True)

class DocumentTextPage(BaseModel):
    page_number: int
    text: str

class DocumentTextResponse(BaseModel):
    document_id: int
    filename: str
    pages: list[DocumentTextPage]
