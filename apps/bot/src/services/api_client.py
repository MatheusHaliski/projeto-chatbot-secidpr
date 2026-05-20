# HTTP client for communicating with the DECIA API backend
from __future__ import annotations

import httpx
from ..config import config


class APIError(Exception):
    def __init__(self, message: str, status_code: int = 0) -> None:
        super().__init__(message)
        self.status_code = status_code


def _build_client() -> httpx.AsyncClient:
    proxies: dict[str, str] = {}
    if config.https_proxy:
        proxies["https://"] = config.https_proxy
    if config.http_proxy:
        proxies["http://"] = config.http_proxy

    return httpx.AsyncClient(
        base_url=config.api_base_url,
        headers={
            "Authorization": f"Bearer {config.workspace_api_token}",
            "X-Bot-Version": config.bot_version,
            "Content-Type": "application/json",
        },
        timeout=35.0,
        proxy=proxies.get("https://") or proxies.get("http://"),
    )


async def _post_webhook(chat_id: str, payload: dict) -> dict:
    async with _build_client() as client:
        payload["chatId"] = chat_id
        response = await client.post("/webhook/bot", json=payload)
        data = response.json()

        if not data.get("success"):
            raise APIError(
                data.get("error", "Erro desconhecido na API"),
                status_code=response.status_code,
            )
        return data.get("data") or {}


async def open_session(chat_id: str, topic: str, opened_by: str) -> dict:
    return await _post_webhook(
        chat_id,
        {"action": "open_session", "topic": topic, "openedBy": opened_by},
    )


async def add_opinion(
    chat_id: str, session_id: str, author: str, author_id: str, content: str
) -> dict:
    return await _post_webhook(
        chat_id,
        {
            "action": "add_opinion",
            "sessionId": session_id,
            "author": author,
            "authorId": author_id,
            "content": content,
        },
    )


async def analyze_session(chat_id: str, session_id: str) -> dict:
    return await _post_webhook(
        chat_id,
        {"action": "analyze", "sessionId": session_id},
    )


async def cancel_session(chat_id: str, session_id: str) -> dict:
    return await _post_webhook(
        chat_id,
        {"action": "cancel_session", "sessionId": session_id},
    )


async def get_status(chat_id: str) -> dict | None:
    result = await _post_webhook(chat_id, {"action": "get_status"})
    return result if result else None
