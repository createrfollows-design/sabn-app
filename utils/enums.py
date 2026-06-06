from enum import StrEnum


class NftStatus(StrEnum):
    """Manual NFT receipt states controlled only by an administrator."""

    WAITING = "waiting"
    RECEIVED = "received"
    NOT_RECEIVED = "not_received"


class PaymentStatus(StrEnum):
    """Manual payment states controlled only by an administrator."""

    WAITING = "waiting"
    PAID = "paid"
    NOT_PAID = "not_paid"


class DealStatus(StrEnum):
    """High-level deal lifecycle states."""

    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTE = "dispute"


class AuditAction(StrEnum):
    """Normalized audit log action names."""

    LOGIN = "login"
    DEAL_CREATED = "deal_created"
    DEAL_UPDATED = "deal_updated"
    FORCE_CLOSE = "force_close"
    USER_BANNED = "user_banned"
    USER_UNBANNED = "user_unbanned"
    REVIEW_CREATED = "review_created"
    DISPUTE_OPENED = "dispute_opened"
    BLOCK_BYPASS_ATTEMPT = "block_bypass_attempt"