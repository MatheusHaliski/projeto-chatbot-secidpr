# Captures free-text opinions from group members during open sessions
from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from telegram.constants import ParseMode

from ..services import api_client
from ..services.session_cache import session_cache
from ..services.api_client import APIError
from ..utils.validators import is_opinion
from ..utils.messages import escape_md


async def handle_opinion(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_chat or not update.effective_user:
        return

    # Ignore bot messages
    if update.effective_user.is_bot:
        return

    text = update.message.text or ""
    if not is_opinion(text):
        return

    chat_id = str(update.effective_chat.id)
    cached = session_cache.get(chat_id)
    if not cached:
        # Lazily check for open session without cache
        try:
            status = await api_client.get_status(chat_id)
            if not status:
                return
            session_cache.set(chat_id, status["id"], status.get("topic", ""))
            session_id = status["id"]
        except APIError:
            return
    else:
        session_id = cached.session_id

    user = update.effective_user
    author = user.username or user.first_name
    author_id = str(user.id)

    try:
        result = await api_client.add_opinion(chat_id, session_id, author, author_id, text)

        # React with thumbs up (requires Telegram Bot API 7.0+)
        try:
            await update.message.set_reaction("👍")
        except Exception:
            pass  # Reaction API not available in all configurations

        current = result.get("currentCount", 0)
        max_op = result.get("max", 20)
        if current >= max_op:
            await update.message.reply_text(
                f"✋ Limite de {max_op} opiniões atingido\\! Use /analisar para gerar a decisão\\.",
                parse_mode=ParseMode.MARKDOWN_V2,
            )
    except APIError as e:
        if e.status_code == 429:
            await update.message.reply_text(
                "✋ Limite de opiniões atingido\\! Use /analisar para gerar a decisão\\.",
                parse_mode=ParseMode.MARKDOWN_V2,
            )
        elif e.status_code != 400:
            # Silently ignore session-not-found errors during opinion capture
            pass
