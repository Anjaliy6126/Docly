from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.chat import Chat
from app.models.document import Document
from app.models.user import User
from app.api.deps import get_current_dev_user
from app.schemas.chat import ChatCreateRequest, ChatResponse

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
