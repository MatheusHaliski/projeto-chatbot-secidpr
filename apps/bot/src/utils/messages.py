# Message templates for the DECIA bot — all formatted in Telegram MarkdownV2
from __future__ import annotations
import re


def escape_md(text: str) -> str:
    """Escape special characters for Telegram MarkdownV2."""
    special = r"\_*[]()~`>#+-=|{}.!"
    return re.sub(f"([{re.escape(special)}])", r"\\\1", text)


def session_opened(topic: str, max_opinions: int) -> str:
    t = escape_md(topic)
    return (
        "🧠 *Sessão DECIA aberta\\!*\n\n"
        f"📌 *Tema:* {t}\n\n"
        "Como participar:\n"
        "• Envie sua opinião livremente no grupo\n"
        f"• Máximo de {max_opinions} opiniões\n\n"
        "Comandos:\n"
        "/status — ver progresso\n"
        "/analisar — gerar decisão coletiva\n"
        "/cancelar — cancelar sessão"
    )


def progress_bar(current: int, total: int, width: int = 10) -> str:
    filled = int((current / total) * width) if total > 0 else 0
    bar = "▓" * filled + "░" * (width - filled)
    return f"\\[{bar}\\] {current}/{total}"


def session_status(topic: str, count: int, max_opinions: int, participants: list[str]) -> str:
    t = escape_md(topic)
    bar = progress_bar(count, max_opinions)
    names = escape_md(", ".join(participants)) if participants else "_nenhum ainda_"
    return (
        "📊 *Status da Sessão*\n\n"
        f"📌 *Tema:* {t}\n"
        f"Opiniões: {bar}\n"
        f"👥 *Participantes:* {names}"
    )


def decision_message(
    topic: str,
    summary: str,
    recommendation: str,
    justification: str,
    pending_points: list[str],
    consensus_level: str,
    opinion_count: int,
    participant_count: int,
) -> str:
    t = escape_md(topic)
    s = escape_md(summary)
    r = escape_md(recommendation)
    j = escape_md(justification)
    pp = "\n".join(f"• {escape_md(p)}" for p in pending_points) if pending_points else "_Nenhum_"
    cl = escape_md(consensus_level)

    return (
        "┌─────────────────────────────────┐\n"
        "│ 🧠 *Decisão Coletiva — DECIA*   │\n"
        f"│ Tema: {t}\n"
        "├─────────────────────────────────┤\n"
        f"📋 *Resumo*\n{s}\n\n"
        f"✅ *Decisão recomendada*\n{r}\n\n"
        f"💡 *Justificativa*\n{j}\n\n"
        f"⚠️ *Pontos pendentes*\n{pp}\n\n"
        f"📊 Consenso: *{cl}*\n"
        f"👥 {opinion_count} opiniões de {participant_count} membros\n"
        "└─────────────────────────────────┘"
    )


def no_session_message() -> str:
    return (
        "Nenhuma sessão aberta neste grupo\\.\n\n"
        "Use /decidir _\\<tema\\>_ para iniciar uma sessão de decisão coletiva\\."
    )


def min_opinions_message() -> str:
    return (
        "⚠️ São necessárias pelo menos *2 opiniões* para gerar uma decisão\\.\n\n"
        "Aguarde mais participantes enviarem suas opiniões\\."
    )
