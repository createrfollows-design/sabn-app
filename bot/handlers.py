from telebot import TeleBot
from telebot.types import CallbackQuery, Message

from database.session import SessionLocal
from models.entities import User
from repositories.users import UserRepository
from services.deal_service import DealService
from services.notification_service import NotificationService
from utils.config import Settings
from utils.enums import DealStatus, NftStatus, PaymentStatus


def register_handlers(bot: TeleBot, settings: Settings) -> None:
    """Register command and callback handlers for admin operations."""

    def is_admin(message_or_call) -> bool:
        """Check whether the Telegram sender matches ADMIN_TELEGRAM_ID."""

        sender = message_or_call.from_user
        return bool(sender and sender.id == settings.admin_telegram_id)

    def ensure_admin_user(db) -> User:
        """Return a persisted admin user for audit attribution in bot commands."""

        return UserRepository(db).upsert_from_telegram(settings.admin_telegram_id, "admin", None, True)

    @bot.message_handler(commands=["start"])
    def start(message: Message) -> None:
        """Send Mini App entry point instructions."""

        bot.reply_to(message, "SABN готов. Откройте Mini App в Full Size режиме через кнопку бота.")

    @bot.message_handler(commands=["force_close"])
    def force_close(message: Message) -> None:
        """Handle /force_close DEAL_ID STATUS regardless of current deal state."""

        if not is_admin(message):
            bot.reply_to(message, "Admin access required.")
            return
        parts = message.text.split(maxsplit=2) if message.text else []
        if len(parts) != 3:
            bot.reply_to(message, "Usage: /force_close 1001 completed")
            return
        _, deal_id_raw, status_raw = parts
        try:
            deal_id = int(deal_id_raw)
            status = DealStatus(status_raw)
        except ValueError:
            bot.reply_to(message, "Invalid command. Example: /force_close 1001 completed")
            return
        with SessionLocal() as db:
            admin = ensure_admin_user(db)
            deal = DealService(db, NotificationService(settings)).force_close(admin, deal_id, status)
            bot.reply_to(message, f"Deal #{deal.id} forced to {deal.deal_status.value}")

    @bot.callback_query_handler(func=lambda call: call.data and call.data.startswith("admin:"))
    def admin_callback(call: CallbackQuery) -> None:
        """Apply inline admin action callbacks from deal cards."""

        if not is_admin(call):
            bot.answer_callback_query(call.id, "Admin access required", show_alert=True)
            return
        _, action, target = call.data.split(":", 2)
        with SessionLocal() as db:
            admin = ensure_admin_user(db)
            service = DealService(db, NotificationService(settings))
            if action == "nft_received":
                service.update_statuses(admin, int(target), dto_from(nft_status=NftStatus.RECEIVED))
            elif action == "payment_paid":
                service.update_statuses(admin, int(target), dto_from(payment_status=PaymentStatus.PAID))
            elif action in {"completed", "cancelled", "dispute"}:
                service.force_close(admin, int(target), DealStatus(action))
            elif action in {"ban", "unban"}:
                user = UserRepository(db).get_by_telegram_id(int(target))
                if user:
                    UserRepository(db).set_ban(user, action == "ban", "Manual inline action")
                    db.commit()
            bot.answer_callback_query(call.id, "SABN status updated")


def dto_from(**kwargs):
    """Create DealStatusUpdate lazily to avoid repeating import paths in callbacks."""

    from schemas.deal import DealStatusUpdate

    return DealStatusUpdate(**kwargs)