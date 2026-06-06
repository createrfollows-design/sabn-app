from telebot.types import InlineKeyboardButton, InlineKeyboardMarkup


def admin_deal_keyboard(deal_id: int, seller_telegram_id: int | None = None) -> InlineKeyboardMarkup:
    """Build inline admin controls for a new deal notification."""

    keyboard = InlineKeyboardMarkup(row_width=2)
    keyboard.add(
        InlineKeyboardButton("Подтвердить получение NFT", callback_data=f"admin:nft_received:{deal_id}"),
        InlineKeyboardButton("Подтвердить оплату", callback_data=f"admin:payment_paid:{deal_id}"),
        InlineKeyboardButton("Открыть спор", callback_data=f"admin:dispute:{deal_id}"),
        InlineKeyboardButton("Завершить сделку", callback_data=f"admin:completed:{deal_id}"),
        InlineKeyboardButton("Отменить сделку", callback_data=f"admin:cancelled:{deal_id}"),
    )
    if seller_telegram_id:
        keyboard.add(
            InlineKeyboardButton("Заблокировать пользователя", callback_data=f"admin:ban:{seller_telegram_id}"),
            InlineKeyboardButton("Разблокировать пользователя", callback_data=f"admin:unban:{seller_telegram_id}"),
        )
    return keyboard