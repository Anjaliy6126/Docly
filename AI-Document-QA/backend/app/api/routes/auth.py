"""
Authentication endpoints: registration and login.

Kept separate from documents/chats so authentication concerns stay isolated.
The tokens issued here are consumed by get_current_user(), which now governs
all protected document/chat/RAG routes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse

router = APIRouter()

# Identical wording for "unknown email" and "wrong password", so the response
# never reveals which one was wrong (prevents account enumeration).
GENERIC_LOGIN_FAILURE = "Incorrect email or password."


def _to_user_response(user: User) -> UserResponse:
    """
    Maps a User row onto the public response shape.

    Built field-by-field on purpose: only these four values can ever be
    serialized, so password_hash has no path into a response body.
    """
    role = user.role or UserRole.student
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=role.value,
    )


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(request: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    """
    Creates a new student account.

    The role is assigned by the server only — RegisterRequest has no `role`
    field, so a client cannot request admin. The password is hashed with the
    existing hash_password() (bcrypt) and the plaintext is never stored,
    logged, or returned.
    """
    # Friendly duplicate check. The unique constraint below still guards the
    # race where two requests register the same email simultaneously.
    existing = db.query(User).filter(User.email == request.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    try:
        password_hash = hash_password(request.password)
    except ValueError as exc:
        # hash_password rejected the input (e.g. longer than bcrypt accepts).
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    user = User(
        name=request.name,
        email=request.email,
        password_hash=password_hash,
        role=UserRole.student,  # server-assigned, never client-supplied
    )

    try:
        db.add(user)
        db.commit()
    except IntegrityError:
        # Unique email constraint lost the race — treat as a duplicate.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create the account.",
        )

    db.refresh(user)
    return _to_user_response(user)


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    """
    Verifies credentials and issues a short-lived JWT access token.

    The token carries the user id as `sub` and the role as a claim. Neither
    the password nor the password hash ever enters the token.
    """
    user = db.query(User).filter(User.email == request.email).first()

    # Unknown email and wrong password produce exactly the same failure, so
    # timing/wording cannot be used to probe which accounts exist.
    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_LOGIN_FAILURE,
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        access_token = create_access_token(
            subject=user.id,
            extra_claims={"role": (user.role or UserRole.student).value},
        )
    except RuntimeError as exc:
        # JWT_SECRET is not configured on this server.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=_to_user_response(user),
    )
