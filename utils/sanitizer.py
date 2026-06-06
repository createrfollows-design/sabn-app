import html
import re


USERNAME_RE = re.compile(r"^@?[A-Za-z0-9_]{5,32}$")


def sanitize_text(value: str, max_length: int = 500) -> str:
    """Normalize user text and escape HTML-sensitive characters."""

    cleaned = " ".join(value.strip().split())[:max_length]
    return html.escape(cleaned, quote=True)


def normalize_username(value: str) -> str:
    """Validate and normalize Telegram usernames to the @username format."""

    candidate = value.strip()
    if not USERNAME_RE.match(candidate):
        raise ValueError("Invalid Telegram username")
    return candidate if candidate.startswith("@") else f"@{candidate}"


def validate_telegram_asset_link(value: str) -> str:
    """Allow only Telegram-hosted NFT, gift, or collectible links."""

    candidate = value.strip()
    if not candidate.startswith("https://t.me/"):
        raise ValueError("Only https://t.me links are allowed")
    if any(symbol in candidate for symbol in ("<", ">", "\"", "'")):
        raise ValueError("Asset link contains unsafe characters")
    return candidate[:300]