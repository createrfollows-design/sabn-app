from pydantic import BaseModel


class TelegramAuthRequest(BaseModel):
    """Payload sent by the Mini App with Telegram initData."""

    init_data: str


class AuthResponse(BaseModel):
    """JWT and CSRF token returned after successful Telegram verification."""

    access_token: str
    token_type: str = "bearer"
    csrf_token: str