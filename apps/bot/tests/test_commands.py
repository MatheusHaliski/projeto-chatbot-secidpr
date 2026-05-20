# Tests for Telegram command handlers using mocked API client
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from telegram import Update, Message, Chat, User


def make_update(text: str = "/decidir Tema de teste") -> MagicMock:
    user = MagicMock(spec=User)
    user.username = "testuser"
    user.first_name = "Test"
    user.is_bot = False
    user.id = 12345

    chat = MagicMock(spec=Chat)
    chat.id = -100123456

    message = MagicMock(spec=Message)
    message.text = text
    message.reply_text = AsyncMock()
    message.reply_document = AsyncMock()

    update = MagicMock(spec=Update)
    update.effective_user = user
    update.effective_chat = chat
    update.message = message
    return update


@pytest.mark.asyncio
async def test_cmd_decidir_success():
    from src.handlers.commands import cmd_decidir

    update = make_update("/decidir Qual tecnologia adotar?")
    context = MagicMock()

    with patch("src.handlers.commands.api_client.open_session", new_callable=AsyncMock) as mock_open:
        mock_open.return_value = {"id": "session-1", "settings": {"maxOpinionsPerSession": 20}}

        with patch("src.handlers.commands.session_cache") as mock_cache:
            await cmd_decidir(update, context)
            mock_open.assert_called_once()
            update.message.reply_text.assert_called_once()


@pytest.mark.asyncio
async def test_cmd_decidir_no_topic():
    from src.handlers.commands import cmd_decidir

    update = make_update("/decidir")
    context = MagicMock()

    await cmd_decidir(update, context)
    update.message.reply_text.assert_called_once()
    call_args = update.message.reply_text.call_args[0][0]
    assert "tema" in call_args.lower() or "exemplo" in call_args.lower()


@pytest.mark.asyncio
async def test_cmd_status_no_session():
    from src.handlers.commands import cmd_status

    update = make_update("/status")
    context = MagicMock()

    with patch("src.handlers.commands.api_client.get_status", new_callable=AsyncMock) as mock_status:
        mock_status.return_value = None
        with patch("src.handlers.commands.session_cache") as mock_cache:
            mock_cache.get.return_value = None
            await cmd_status(update, context)
            update.message.reply_text.assert_called_once()
