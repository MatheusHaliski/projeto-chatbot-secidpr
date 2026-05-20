# In-memory TTL cache for active session IDs — avoids redundant API calls
from __future__ import annotations

import time
from dataclasses import dataclass, field

TTL_SECONDS = 3600  # 1 hour


@dataclass
class CacheEntry:
    session_id: str
    topic: str
    expires_at: float = field(default_factory=lambda: time.monotonic() + TTL_SECONDS)

    def is_valid(self) -> bool:
        return time.monotonic() < self.expires_at


class SessionCache:
    def __init__(self) -> None:
        self._store: dict[str, CacheEntry] = {}

    def set(self, chat_id: str, session_id: str, topic: str) -> None:
        self._store[chat_id] = CacheEntry(session_id=session_id, topic=topic)

    def get(self, chat_id: str) -> CacheEntry | None:
        entry = self._store.get(chat_id)
        if entry and entry.is_valid():
            return entry
        if entry:
            del self._store[chat_id]
        return None

    def delete(self, chat_id: str) -> None:
        self._store.pop(chat_id, None)

    def clear_expired(self) -> None:
        expired = [k for k, v in self._store.items() if not v.is_valid()]
        for key in expired:
            del self._store[key]


session_cache = SessionCache()
