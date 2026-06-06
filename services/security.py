from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

import jwt
from fastapi import Header, HTTPException, Request, status

from utils.config import Settings


def create_csrf_token() -> str:
    """Generate a random CSRF token bound into the JWT claims."""

    return token_urlsafe(32)


def create_access_token(settings: Settings, subject: str, csrf_token: str, is_admin: bool) -> str:
    """Create a signed JWT for Mini App API access."""

    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "csrf": csrf_token,
        "is_admin": is_admin,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(settings: Settings, token: str) -> dict:
    """Decode and validate a JWT, raising HTTP errors on failure."""

    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def extract_bearer_token(request: Request) -> str:
    """Read the Bearer token from the Authorization header."""

    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return token


def assert_csrf(payload: dict, csrf_header: str | None = Header(default=None, alias="X-CSRF-Token")) -> None:
    """Validate the double-submit CSRF header against the JWT claim."""

    if not csrf_header or csrf_header != payload.get("csrf"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")