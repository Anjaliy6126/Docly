from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class ProcessingStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    processed = "processed"
    failed = "failed"

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    # The document belongs to a specific user
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    title = Column(String)
    category = Column(String, index=True)
    file_size = Column(Integer)  # File size in bytes
    
    status = Column(SQLEnum(ProcessingStatus), default=ProcessingStatus.uploaded)
    
    upload_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    updated_timestamp = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="documents")
    # Many-to-many relationship with Chat
    chats = relationship("Chat", secondary="chat_documents", back_populates="documents")
