# Input validation helpers for bot commands
from __future__ import annotations


def extract_topic(text: str, command: str) -> str | None:
    """Extract topic from a command like '/decidir <topic>'."""
    parts = text.strip().split(None, 1)
    if len(parts) < 2:
        return None
    topic = parts[1].strip()
    return topic if topic else None


def is_opinion(text: str) -> bool:
    """Return True if message text looks like a user opinion (not a command)."""
    if not text or text.startswith("/"):
        return False
    return len(text.strip()) >= 3
