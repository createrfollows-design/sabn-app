from telebot import TeleBot

from bot.handlers import register_handlers
from database.session import init_db
from utils.config import get_settings


def main() -> None:
    """Run the SABN Telegram bot long polling process."""

    settings = get_settings()
    init_db()
    bot = TeleBot(settings.bot_token, parse_mode="HTML")
    register_handlers(bot, settings)
    bot.infinity_polling(skip_pending=True)


if __name__ == "__main__":
    main()