from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

# auto_error=False stops FastAPI from auto-raising its own error when the
# header is missing or has the wrong scheme, so every authentication failure
# is handled below and returns one consistent 401 with WWW-Authenticate.
_bearer_scheme = HTTPBearer(auto_error=False)

# One generic body for every authentication failure. Telling the client
# *which* thing failed (expired vs tampered signature vs deleted user) would
# leak JWT parsing details, so all paths are indistinguishable from outside.
AUTH_FAILURE_DETAIL = "Not authenticated."


def _unauthorized() -> HTTPException:
    """The single 401 used for all authentication failures."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=AUTH_FAILURE_DETAIL,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Resolves the authenticated user from `Authorization: Bearer <token>`.

    Flow: read bearer token -> decode_access_token() (signature + expiry) ->
    treat `sub` as User.id -> load that row from the database.

    The database row is authoritative. The token's `role` claim is never
    consulted here, so a stale or forged claim cannot grant anything: roles
    are re-read from the User record on every request.

    Raises 401 (with `WWW-Authenticate: Bearer`) when the token is missing,
    malformed, invalid, expired, has a missing/non-integer/invalid `sub`, or
    references a user that no longer exists. There is deliberately no
    fallback to get_current_dev_user(): an unauthenticated request must
    never silently become dev@example.com.
    """
    if credentials is None or not credentials.credentials:
        raise _unauthorized()

    try:
        claims = decode_access_token(credentials.credentials)
    except RuntimeError as exc:
        # JWT_SECRET is not configured — a server misconfiguration, not a
        # client error, so it must not masquerade as 401.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication is not configured on this server.",
        ) from exc
    except ValueError:
        # Expired / malformed / tampered token -> same generic 401.
        raise _unauthorized()

    # `sub` must be a usable User.id.
    try:
        user_id = int(claims.get("sub"))
    except (TypeError, ValueError):
        raise _unauthorized()
    if user_id < 1:
        raise _unauthorized()

    user = db.get(User, user_id)
    if user is None:
        # Token references a user that has since been deleted.
        raise _unauthorized()
    return user


def get_current_dev_user(db: Session = Depends(get_db)) -> User:
    """
    Temporary dependency providing the fixed 'development user'.

    Retained only for backwards compatibility with any code that still
    references it — it NO LONGER governs any protected production route
    (documents, chats and RAG now use get_current_user()). It must not be
    reintroduced on new endpoints.
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
