# DECIA Bot — entry point for the Telegram bot
import logging
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
)

from .config import config
from .handlers.commands import (
    cmd_decidir,
    cmd_status,
    cmd_analisar,
    cmd_cancelar,
    cmd_ajuda,
    callback_cancelar,
)
from .handlers.messages import handle_opinion
from .handlers.errors import error_handler

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
# Suppress verbose httpx logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)


def main() -> None:
    builder = Application.builder().token(config.telegram_bot_token)

    if config.https_proxy:
        builder = builder.proxy(config.https_proxy)

    app = builder.build()

    app.add_handler(CommandHandler("decidir", cmd_decidir))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("analisar", cmd_analisar))
    app.add_handler(CommandHandler("cancelar", cmd_cancelar))
    app.add_handler(CommandHandler("ajuda", cmd_ajuda))
    app.add_handler(CommandHandler("start", cmd_ajuda))
    app.add_handler(CallbackQueryHandler(callback_cancelar, pattern=r"^cancel:"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_opinion))
    app.add_error_handler(error_handler)

    logger.info("DECIA Bot iniciado")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
