from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from utils.sanitizer import sanitize_text


class ReviewCreate(BaseModel):
    """DTO for post-deal user reviews."""

    rating: int = Field(ge=1, le=5)
    text: str = Field(min_length=2, max_length=500)

    @field_validator("text")
    @classmethod
    def clean_text(cls, value: str) -> str:
        """Sanitize review text before storing it."""

        return sanitize_text(value)


class ReviewOut(BaseModel):
    """Review representation returned in trust profiles."""

    id: int
    deal_id: int
    rating: int
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}