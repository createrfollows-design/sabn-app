# Secure Assets Bridge Node (SABN)

SABN состоит из Telegram Mini App на React и backend-каркаса FastAPI + SQLite + SQLAlchemy + PyTelegramBotAPI.

## Локальный запуск в Termux

1. `cp .env.example .env`
2. Заполните `BOT_TOKEN`, `ADMIN_TELEGRAM_ID`, `JWT_SECRET`.
3. `python -m venv .venv && source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. API: `uvicorn api.main:app --host 0.0.0.0 --port 8000`
6. Bot: `python -m bot.runner`
7. Frontend: `npm run dev`

## Важная бизнес-логика

Автоматических проверок блокчейна нет. NFT, оплату, споры, завершение и отмену подтверждает только администратор через API или Telegram inline-кнопки.

## Безопасность

Backend содержит проверку Telegram Init Data, JWT, CSRF-заголовок, rate limit, Pydantic validation, HTML sanitization, audit logs и ручную систему банов.