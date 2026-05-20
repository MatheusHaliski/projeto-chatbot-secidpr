# Telegram command handlers: /decidir /analisar /cancelar /status /ajuda
from __future__ import annotations

import io
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram.constants import ParseMode

from ..services import api_client
from ..services.session_cache import session_cache
from ..utils.messages import (
    session_opened,
    session_status,
    decision_message,
    no_session_message,
    min_opinions_message,
    escape_md,
)
from ..utils.validators import extract_topic
from ..services.api_client import APIError


async def cmd_decidir(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_chat:
        return

    chat_id = str(update.effective_chat.id)
    user = update.effective_user
    username = user.username or user.first_name if user else "desconhecido"

    topic = extract_topic(update.message.text or "", "/decidir")
    if not topic:
        await update.message.reply_text(
            "Por favor informe o tema\\. Exemplo:\n`/decidir Qual linguagem usar no projeto?`",
            parse_mode=ParseMode.MARKDOWN_V2,
        )
        return

    try:
        session = await api_client.open_session(chat_id, topic, username)
        session_cache.set(chat_id, session["id"], topic)
        max_op = session.get("settings", {}).get("maxOpinionsPerSession", 20)
        await update.message.reply_text(
            session_opened(topic, max_op),
            parse_mode=ParseMode.MARKDOWN_V2,
        )
    except APIError as e:
        if e.status_code == 409:
            await update.message.reply_text(
                "Já existe uma sessão aberta neste grupo\\. Use /status para ver o progresso\\.",
                parse_mode=ParseMode.MARKDOWN_V2,
            )
        else:
            await update.message.reply_text(
                f"Erro ao abrir sessão: {escape_md(str(e))}",
                parse_mode=ParseMode.MARKDOWN_V2,
            )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_chat:
        return

    chat_id = str(update.effective_chat.id)

    try:
        status = await api_client.get_status(chat_id)
        if not status:
            await update.message.reply_text(
                no_session_message(), parse_mode=ParseMode.MARKDOWN_V2
            )
            return

        session_cache.set(chat_id, status["id"], status.get("topic", ""))
        await update.message.reply_text(
            session_status(
                topic=status.get("topic", ""),
                count=status.get("opinionCount", 0),
                max_opinions=status.get("max", 20),
                participants=status.get("participantList", []),
            ),
            parse_mode=ParseMode.MARKDOWN_V2,
        )
    except APIError as e:
        await update.message.reply_text(
            f"Erro ao buscar status: {escape_md(str(e))}",
            parse_mode=ParseMode.MARKDOWN_V2,
        )


async def cmd_analisar(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_chat:
        return

    chat_id = str(update.effective_chat.id)
    cached = session_cache.get(chat_id)

    if not cached:
        try:
            status = await api_client.get_status(chat_id)
            if not status:
                await update.message.reply_text(
                    no_session_message(), parse_mode=ParseMode.MARKDOWN_V2
                )
                return
            session_id = status["id"]
            session_cache.set(chat_id, session_id, status.get("topic", ""))
        except APIError as e:
            await update.message.reply_text(
                f"Erro: {escape_md(str(e))}", parse_mode=ParseMode.MARKDOWN_V2
            )
            return
    else:
        session_id = cached.session_id

    thinking_msg = await update.message.reply_text(
        "⏳ Analisando opiniões com IA\\.\\.\\.", parse_mode=ParseMode.MARKDOWN_V2
    )

    try:
        result = await api_client.analyze_session(chat_id, session_id)
        session_cache.delete(chat_id)

        decision = result.get("decision", {})
        artifact = result.get("artifact", {})

        # Get participant info from status before closing
        msg_text = decision_message(
            topic=result.get("topic", cached.topic if cached else ""),
            summary=decision.get("summary", ""),
            recommendation=decision.get("recommendation", ""),
            justification=decision.get("justification", ""),
            pending_points=decision.get("pendingPoints", []),
            consensus_level=decision.get("consensusLevel", ""),
            opinion_count=result.get("opinionCount", 0),
            participant_count=result.get("participantCount", 0),
        )

        await thinking_msg.delete()
        await update.message.reply_text(msg_text, parse_mode=ParseMode.MARKDOWN_V2)

        # Send artifact as file if content exists
        if artifact.get("content") and artifact.get("filename"):
            file_bytes = artifact["content"].encode("utf-8")
            file_obj = io.BytesIO(file_bytes)
            file_obj.name = artifact["filename"]
            await update.message.reply_document(
                document=file_obj,
                filename=artifact["filename"],
                caption="📎 Artefato gerado pela análise",
            )

    except APIError as e:
        await thinking_msg.delete()
        if e.status_code == 400 and "2 opiniões" in str(e):
            await update.message.reply_text(
                min_opinions_message(), parse_mode=ParseMode.MARKDOWN_V2
            )
        else:
            await update.message.reply_text(
                f"Erro na análise: {escape_md(str(e))}", parse_mode=ParseMode.MARKDOWN_V2
            )


async def cmd_cancelar(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.effective_chat:
        return

    chat_id = str(update.effective_chat.id)
    cached = session_cache.get(chat_id)

    if not cached:
        try:
            status = await api_client.get_status(chat_id)
            if not status:
                await update.message.reply_text(
                    no_session_message(), parse_mode=ParseMode.MARKDOWN_V2
                )
                return
            session_id = status["id"]
            topic = status.get("topic", "")
        except APIError as e:
            await update.message.reply_text(
                f"Erro: {escape_md(str(e))}", parse_mode=ParseMode.MARKDOWN_V2
            )
            return
    else:
        session_id = cached.session_id
        topic = cached.topic

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Sim, cancelar", callback_data=f"cancel:{session_id}"),
            InlineKeyboardButton("❌ Não", callback_data="cancel:no"),
        ]
    ])

    await update.message.reply_text(
        f"Tem certeza que deseja cancelar a sessão sobre *{escape_md(topic)}*?",
        reply_markup=keyboard,
        parse_mode=ParseMode.MARKDOWN_V2,
    )


async def callback_cancelar(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.callback_query or not update.effective_chat:
        return

    query = update.callback_query
    await query.answer()

    data = query.data or ""
    if data == "cancel:no":
        await query.edit_message_text("Cancelamento abortado\\.", parse_mode=ParseMode.MARKDOWN_V2)
        return

    session_id = data.replace("cancel:", "")
    chat_id = str(update.effective_chat.id)

    try:
        await api_client.cancel_session(chat_id, session_id)
        session_cache.delete(chat_id)
        await query.edit_message_text(
            "✅ Sessão cancelada com sucesso\\.", parse_mode=ParseMode.MARKDOWN_V2
        )
    except APIError as e:
        await query.edit_message_text(
            f"Erro ao cancelar: {escape_md(str(e))}", parse_mode=ParseMode.MARKDOWN_V2
        )


async def cmd_ajuda(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message:
        return

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("Nova sessão", switch_inline_query_current_chat="/decidir ")],
        [InlineKeyboardButton("Ver status", switch_inline_query_current_chat="/status")],
    ])

    await update.message.reply_text(
        "🤖 *DECIA — Decisão Coletiva com IA*\n\n"
        "*Comandos disponíveis:*\n\n"
        "/decidir _\\<tema\\>_ — Abre uma nova sessão de decisão\n"
        "/status — Mostra o progresso da sessão atual\n"
        "/analisar — Gera a decisão coletiva com IA\n"
        "/cancelar — Cancela a sessão atual\n"
        "/ajuda — Exibe este menu\n\n"
        "*Como funciona:*\n"
        "1\\. Use /decidir para abrir uma sessão com um tema\n"
        "2\\. Membros do grupo enviam suas opiniões livremente\n"
        "3\\. Use /analisar para gerar a decisão com IA\n"
        "4\\. Receba a decisão e o artefato gerado",
        reply_markup=keyboard,
        parse_mode=ParseMode.MARKDOWN_V2,
    )
