from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole

def get_current_dev_user(db: Session = Depends(get_db)) -> User:
    """
    Temporary dependency to provide a 'development user' for document ownership.
    This ensures we don't break the owner_id foreign key constraint in the Document table.
    This MUST be replaced with actual JWT authentication in the future.
    """
    dev_email = "dev@example.com"
    user = db.query(User).filter(User.email == dev_email).first()
    
    if not user:
        # Create a dummy user if it doesn't exist yet
        user = User(
            name="Development User",
            email=dev_email,
            password_hash="fake_hash_do_not_use",
            role=UserRole.admin
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    return user
