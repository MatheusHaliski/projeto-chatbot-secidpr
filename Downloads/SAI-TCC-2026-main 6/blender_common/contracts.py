from __future__ import annotations

from typing import Any

TERMINAL_STATUSES = {"completed", "failed", "cancelled"}
_STATUS_ALIASES = {
    "queued": "queued",
    "pending": "queued",
    "submitted": "submitted",
    "accepted": "submitted",
    "running": "in_progress",
    "processing": "in_progress",
    "in_progress": "in_progress",
    "completed": "completed",
    "succeeded": "completed",
    "success": "completed",
    "failed": "failed",
    "error": "failed",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "timed_out": "failed",
    "timeout": "failed",
}


def normalize_status(status_like: Any) -> str:
    normalized = str(status_like or "").strip().lower().replace("-", "_").replace(" ", "_")
    return _STATUS_ALIASES.get(normalized, "queued")


def finalize_job_status(status_like: Any, artifacts: dict[str, Any] | None, error: dict[str, Any] | str | None) -> str:
    """
    Apply normalized terminal rules:
    - error-first failure logic (except explicit cancelled)
    - artifact-first completion logic
    - completed/failed/cancelled are terminal
    """
    normalized = normalize_status(status_like)
    if normalized == "cancelled":
        return "cancelled"
    if error:
        return "failed"
    if artifacts:
        return "completed"
    return normalized
