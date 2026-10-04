"""
Request/response schemas for the authentication endpoints.

These are deliberately separate from the User ORM model: request bodies are
never validated directly against database models, and responses are declared
from an explicit allow-list of fields so a password hash can never leak into
JSON even by accident.

Password policy here is intentionally light — blank is rejected and a
reasonable maximum length is enforced, but there are no composition rules
(minimum digits/symbols/uppercase), which hurt usability more than they help.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator

# bcrypt cannot process more than 72 UTF-8 bytes (see app/core/security.py),
# so this is a correctness ceiling rather than a complexity rule.
MAX_PASSWORD_LENGTH = 72
MAX_NAME_LENGTH = 120


class _EmailPasswordBase(BaseModel):
    """Email + password fields and their normalisation, shared by register/login."""

    email: EmailStr = Field(description="Account email, normalised to lowercase.")
    password: str = Field(
        min_length=1,
        max_length=MAX_PASSWORD_LENGTH,
        description="Plain password. Never stored or returned in plaintext.",
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        # Runs BEFORE EmailStr validation so surrounding whitespace or mixed
        # case can never produce a different account for the same address.
        if isinstance(value, str):
            value = value.strip().lower()
        if not value:
            raise ValueError("email must not be blank.")
        return value

    @field_validator("password")
    @classmethod
    def password_must_not_be_blank(cls, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("password must not be blank.")
        # Deliberately NOT stripped: leading/trailing spaces are part of the
        # password the user typed, and silently trimming would change it.
        return value


class RegisterRequest(_EmailPasswordBase):
    """POST /auth/register body."""

    name: str = Field(max_length=MAX_NAME_LENGTH, description="Display name.")

    # `role` is intentionally NOT declared. Clients cannot choose a role: any
    # extra "role" key in the request body is ignored by Pydantic and the
    # server assigns UserRole.student itself.

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        if isinstance(value, str):
            value = value.strip()
        if not value:
            raise ValueError("name must not be blank.")
        return value


class LoginRequest(_EmailPasswordBase):
    """POST /auth/login body."""


class UserResponse(BaseModel):
    """
    Safe public user info returned by register and login.

    There is no password/password_hash field, so these values cannot be
    serialized. The route builds this explicitly rather than from ORM
    attributes, as a second line of defence.
    """

    id: int
    name: str
    email: str
    role: str


class LoginResponse(BaseModel):
    """POST /auth/login success body."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
