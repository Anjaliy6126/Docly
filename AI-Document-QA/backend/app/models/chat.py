from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

# Association Table for the Many-to-Many relationship between Chats and Documents
chat_documents = Table(
    "chat_documents",
    Base.metadata,
    Column("chat_id", Integer, ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True),
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint("chat_id", "document_id", name="uq_chat_document")
)

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    # The chat belongs to a specific user
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="chats")
    # If a chat is deleted, its messages should be deleted too
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan", order_by="Message.created_at")
    # Many-to-many relationship with Document
    documents = relationship("Document", secondary=chat_documents, back_populates="chats")
