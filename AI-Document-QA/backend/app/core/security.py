"""
Authentication foundation: password hashing and JWT utilities.

Why bcrypt + PyJWT (and nothing bigger):
Both are small, widely audited, single-purpose libraries. We deliberately do
NOT pull in a full auth framework (OAuth2 flows, user managers, session
middleware) because this application only needs to hash/verify passwords and
issue/verify short-lived bearer tokens. The functions here are plain and
depend on nothing beyond those two libraries, so the next prompt can wire
them into FastAPI dependencies without fighting a framework.

Design constraints honoured in this module:
- No plaintext password is ever stored; bcrypt does the hashing (no custom
  cryptography).
- No secret is hard-coded: all JWT configuration comes from
  app.core.config, which reads the environment (.env).
- Nothing here touches the database or the request cycle, so the utilities
  are trivially reusable and testable with in-memory values only.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union

import bcrypt
import jwt

from app.core.config import settings


# ── Password hashing ────────────────────────────────────────────────────────

# bcrypt silently truncates input beyond 72 BYTES. That would make two
# different long passwords verify as the same credential, so we reject
# over-long input instead of truncating quietly. 72 characters of ASCII is
# far beyond what any reasonable passphrase needs, so this is a correctness
# guard rather than a usability restriction.
BCRYPT_MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    """
    Hashes a password with bcrypt and returns the encoded hash string.

    The returned value is self-describing — it embeds the bcrypt marker, the
    cost factor and a per-password random salt — so it can be stored as-is in
    User.password_hash and later fed straight to verify_password().

    Two hashes of the same password differ because of the random salt, which
    is what defeats precomputed rainbow tables.

    Raises ValueError only for genuinely unusable input: not a string, empty,
    or longer than bcrypt can safely process.
    """
    if not isinstance(password, str):
        raise ValueError("password must be a string.")
    if not password:
        raise ValueError("password must not be empty.")
    if len(password.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
        raise ValueError(
            f"password must be at most {BCRYPT_MAX_PASSWORD_BYTES} bytes when "
            "encoded as UTF-8 (bcrypt truncates anything longer)."
        )

    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """
    Returns True only when `password` matches the stored `password_hash`.

    This never raises for bad credentials: a login attempt against a missing,
    empty or malformed hash record must behave exactly like a wrong password
    (False) rather than crash the request or reveal which field was wrong.
    That also means the placeholder value currently written by
    get_current_dev_user ("fake_hash_do_not_use") verifies as False instead
    of blowing up, so the existing development flow keeps working untouched.
    """
    if not isinstance(password, str) or not password:
        return False
    if not isinstance(password_hash, str) or not password_hash:
        return False
    # A longer password would be truncated by bcrypt before comparison, which
    # could produce a false positive against a shorter stored password.
    if len(password.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
        return False

    try:
        return bcrypt.checkpw(
            password.encode("utf-8"), password_hash.encode("utf-8")
        )
    except (ValueError, TypeError):
        # Malformed or legacy hash — treat as "does not match".
        return False


# ── JWT access tokens ───────────────────────────────────────────────────────

def _require_jwt_secret() -> str:
    """
    Returns the configured JWT secret, failing loudly when it is absent.

    A missing secret must never fall back to a built-in default: a guessable
    signing key would let anyone mint valid tokens. Failing at token time
    with an actionable message is far safer than shipping a default.
    """
    secret = settings.JWT_SECRET
    if not secret:
        raise RuntimeError(
            "JWT_SECRET is not configured. Set it in the environment "
            "(see backend/.env.example) before issuing or verifying tokens."
        )
    return secret


def create_access_token(
    subject: Union[int, str],
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Creates a signed JWT access token.

    `subject` becomes the standard `sub` claim and is always stored as a
    string (RFC 7519); callers normally pass the user id.

    `expires_delta` overrides the configured lifetime. It exists mainly so
    tests can mint an already-expired token without touching configuration.

    `extra_claims` carries optional additions such as `role`. It cannot
    overwrite the security-relevant claims, so a caller cannot accidentally
    issue a token whose expiry or subject disagrees with the signature
    inputs.
    """
    secret = _require_jwt_secret()

    now = datetime.now(timezone.utc)
    lifetime = (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": now + lifetime,
    }

    if extra_claims:
        reserved = {"sub", "iat", "exp"} & set(extra_claims)
        if reserved:
            raise ValueError(
                f"extra_claims may not override reserved claims: {sorted(reserved)}"
            )
        payload.update(extra_claims)

    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Verifies a token's signature and expiration, returning its claims.

    Every failure mode raises ValueError with a clear, non-leaky message so
    callers can translate it uniformly into HTTP 401 in the next prompt:
      - expired token            -> jwt.ExpiredSignatureError
      - tampered / malformed / wrong signature or algorithm
                                  -> jwt.PyJWTError
      - missing required claims  -> jwt.PyJWTError (via options["require"])

    `require` rejects tokens that lack `exp` or `sub`, so a token minted
    outside this module cannot outlive its intended lifetime.
    """
    secret = _require_jwt_secret()

    if not isinstance(token, str) or not token.strip():
        raise ValueError("token must be a non-empty string.")

    try:
        return jwt.decode(
            token,
            secret,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise ValueError("Token has expired.") from exc
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid or unusable token.") from exc
