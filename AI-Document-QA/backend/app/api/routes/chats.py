from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chat import Chat
from app.models.document import Document
from app.models.message import Message, MessageRole
from app.models.user import User
from app.api.deps import get_current_dev_user
from app.schemas.chat import (
    ChatCreateRequest,
    ChatResponse,
    MessageCreateRequest,
    MessageResponse,
    ChatMessageResponse,
    ChatMessagesResponse,
)
from app.services import rag_service
from app.services.document_vector_store import document_vector_store

router = APIRouter()

@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    request: ChatCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    """
    Creates a persistent chat owned by the current (dev) user and links the
    selected documents to it through the chat_documents association table.

    Transaction safety: the Chat row and all ChatDocument associations are
    committed together. If anything fails, the session is rolled back so no
    partially-created chat is left behind. No Message row is created here.
    """
    # 1. Verify every requested document exists (and belongs to this user,
    #    consistent with the ownership checks in the documents routes).
    documents = (
        db.query(Document)
        .filter(
            Document.id.in_(request.document_ids),
            Document.owner_id == current_user.id,
        )
        .all()
    )
    found_ids = {doc.id for doc in documents}
    missing_ids = [doc_id for doc_id in request.document_ids if doc_id not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document(s) not found: {missing_ids}. Please check the document IDs.",
        )

    # 2. Create the chat and associate the documents in one transaction.
    try:
        chat = Chat(
            owner_id=current_user.id,
            title=request.title,
        )
        # Assigning the relationship inserts one row per document into the
        # chat_documents table (the DB unique constraint also guards
        # against duplicates).
        chat.documents = documents
        db.add(chat)
        db.commit()
        db.refresh(chat)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create the chat.",
        )

    # 3. Return the created chat with its selected document IDs.
    return ChatResponse(
        id=chat.id,
        title=chat.title,
        document_ids=sorted(doc.id for doc in chat.documents),
        created_at=chat.created_at.isoformat(),
        updated_at=chat.updated_at.isoformat(),
    )

@router.post("/{chat_id}/messages", response_model=ChatMessageResponse)
def send_chat_message(
    chat_id: int,
    request: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    """
    Answers a question inside a chat using RAG restricted to the documents
    associated with that chat, then persists both the user message and the
    assistant message.

    Transaction safety: the RAG pipeline runs BEFORE any Message row is
    created, so a failed generation leaves no partially-completed
    conversation. Both messages are committed together afterwards; if the
    commit fails, the session is rolled back.
    """
    # 1. Find the chat (scoped to the dev user, consistent with the rest).
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.owner_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    # 2. Load the documents associated with this chat through ChatDocument.
    chat_document_ids = sorted({doc.id for doc in chat.documents})
    if not chat_document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This chat has no associated documents. Add at least one document before asking questions.",
        )

    # 3. Run the existing RAG pipeline, restricted to the chat's documents.
    #    No Message rows exist yet, so a RAG failure stores nothing.
    try:
        rag_result = rag_service.answer_question_from_store(
            question=request.content,
            vector_store=document_vector_store,
            top_k=rag_service.DEFAULT_TOP_K,
            document_ids=chat_document_ids,
        )
    except RuntimeError as exc:
        # RAG/LLM failures (Ollama down, timeout, bad response) surface as
        # clear, safe messages — no stack traces.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    # 4. Persist both messages together in one transaction.
    try:
        user_message = Message(
            chat_id=chat.id,
            role=MessageRole.user,
            content=request.content,
        )
        assistant_message = Message(
            chat_id=chat.id,
            role=MessageRole.assistant,
            content=rag_result["answer"],
        )
        db.add_all([user_message, assistant_message])
        db.commit()
        db.refresh(user_message)
        db.refresh(assistant_message)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save the messages.",
        )

    # 5. Return both messages plus the grounding sources (no embeddings).
    return ChatMessageResponse(
        chat_id=chat.id,
        user_message=MessageResponse(
            id=user_message.id,
            role=user_message.role.value,
            content=user_message.content,
            created_at=user_message.created_at.isoformat(),
        ),
        assistant_message=MessageResponse(
            id=assistant_message.id,
            role=assistant_message.role.value,
            content=assistant_message.content,
            created_at=assistant_message.created_at.isoformat(),
        ),
        sources=rag_result["sources"],
    )

@router.get("/{chat_id}/messages", response_model=ChatMessagesResponse)
def get_chat_messages(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_dev_user)
):
    """
    Returns the persisted conversation history for a chat, oldest first.

    This endpoint only reads data: no Ollama/FAISS/embedding calls and no
    database writes. Messages are ordered by created_at ASC, with id as a
    deterministic tiebreaker because the user and assistant messages of one
    exchange are committed in the same transaction and can share an
    identical created_at timestamp.
    """
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.owner_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found.")

    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat.id)
        .order_by(Message.created_at.asc(), Message.id.asc())
        .all()
    )

    return ChatMessagesResponse(
        chat_id=chat.id,
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role.value,
                content=m.content,
                created_at=m.created_at.isoformat(),
            )
            for m in messages
        ],
    )
