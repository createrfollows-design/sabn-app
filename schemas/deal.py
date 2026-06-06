from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from utils.enums import DealStatus, NftStatus, PaymentStatus
from utils.sanitizer import normalize_username, sanitize_text, validate_telegram_asset_link


class DealCreate(BaseModel):
    """DTO for user-created deals."""

    seller_username: str
    asset_link: str
    price_stars: int = Field(gt=0, le=10_000_000)
    comment: str = Field(default="", max_length=500)

    @field_validator("seller_username")
    @classmethod
    def validate_seller(cls, value: str) -> str:
        """Normalize seller username and reject malformed values."""

        return normalize_username(value)

    @field_validator("asset_link")
    @classmethod
    def validate_asset_link(cls, value: str) -> str:
        """Allow only safe Telegram-hosted asset links."""

        return validate_telegram_asset_link(value)

    @field_validator("comment")
    @classmethod
    def clean_comment(cls, value: str) -> str:
        """Sanitize optional user comment."""

        return sanitize_text(value)


class DealStatusUpdate(BaseModel):
    """Admin-only update for manual deal statuses."""

    nft_status: NftStatus | None = None
    payment_status: PaymentStatus | None = None
    deal_status: DealStatus | None = None


class DealOut(BaseModel):
    """Public deal representation returned to Mini App clients."""

    id: int
    seller_username: str
    buyer_username: str
    asset_link: str
    price_stars: int
    comment: str
    nft_status: NftStatus
    payment_status: PaymentStatus
    deal_status: DealStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}