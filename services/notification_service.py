from telebot import TeleBot
from telebot.types import InlineKeyboardMarkup

from bot.keyboards import admin_deal_keyboard

from models.entities import Deal, Review, User
from utils.config import Settings


class NotificationService:
    """Sends operational alerts to the configured Telegram administrator."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.bot = TeleBot(settings.bot_token, parse_mode="HTML") if settings.bot_token else None

    def send_admin_message(self, text: str, reply_markup: InlineKeyboardMarkup | None = None) -> None:
        """Send a best-effort message to the Telegram administrator."""

        if not self.bot or not self.settings.admin_telegram_id:
            return
        self.bot.send_message(self.settings.admin_telegram_id, text, disable_web_page_preview=True, reply_markup=reply_markup)

    def deal_created(self, deal: Deal) -> None:
        """Notify admin about a new deal."""

        self.send_admin_message(
            f"<b>New SABN deal #{deal.id}</b>\nSeller: {deal.seller_username}\nBuyer: {deal.buyer_username}\nPrice: {deal.price_stars} Stars\n{deal.asset_link}",
            reply_markup=admin_deal_keyboard(deal.id),
        )

    def dispute_opened(self, deal: Deal) -> None:
        """Notify admin about a user-opened dispute."""

        self.send_admin_message(f"<b>Dispute opened</b>\nDeal #{deal.id}\nManual decision required.")

    def review_created(self, review: Review) -> None:
        """Notify admin about a new review."""

        self.send_admin_message(f"<b>New review</b>\nDeal #{review.deal_id}\nRating: {review.rating}/5")

    def ban_event(self, user: User, is_banned: bool) -> None:
        """Notify admin about ban or unban actions."""

        state = "banned" if is_banned else "unbanned"
        self.send_admin_message(f"<b>User {state}</b>\n@{user.username}\nReason: {user.ban_reason or '-'}")