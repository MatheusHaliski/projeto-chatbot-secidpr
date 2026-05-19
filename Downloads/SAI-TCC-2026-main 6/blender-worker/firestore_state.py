"""
firestore_state.py — Best-effort Firestore persistence for worker job state.

Writes to the `worker_jobs/{jobId}` collection at each pipeline stage so job
state survives pod restarts and the Next.js reconcile can recover stalled jobs
by stage without re-charging Meshy credits.

All writes are fire-and-forget: failures are logged and swallowed so a Firestore
outage never aborts the pipeline.

Credentials are resolved from env vars in this order:
  1. FIREBASE_SERVICE_ACCOUNT_JSON  — full service-account JSON blob (preferred)
  2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY — individual vars
     (matches the naming convention used by the Next.js side)
"""
from __future__ import annotations

import json
import logging
import os
import threading
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("stylistai.firestore_state")

WORKER_JOBS_COLLECTION = "worker_jobs"

_db = None
_init_attempted = False
_init_lock = threading.Lock()


def _get_db():
    global _db, _init_attempted
    with _init_lock:
        if _init_attempted:
            return _db
        _init_attempted = True

    try:
        import firebase_admin  # noqa: PLC0415
        from firebase_admin import credentials, firestore as admin_fs  # noqa: PLC0415

        creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
        if creds_json:
            cred = credentials.Certificate(json.loads(creds_json))
        else:
            project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
            client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "").strip()
            raw_key = os.getenv("FIREBASE_PRIVATE_KEY", "").strip()
            private_key = raw_key.replace("\\n", "\n")
            if not (project_id and client_email and private_key):
                logger.warning(
                    "[firestore_state] credentials not configured "
                    "(set FIREBASE_SERVICE_ACCOUNT_JSON or the three individual vars) "
                    "— Firestore writes disabled"
                )
                return None
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "client_email": client_email,
                "private_key": private_key,
                "token_uri": "https://oauth2.googleapis.com/token",
            })

        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)

        _db = admin_fs.client()
        logger.info("[firestore_state] Firestore client initialised")
        return _db

    except Exception as exc:  # noqa: BLE001
        logger.warning("[firestore_state] init failed — Firestore writes disabled: %s", exc)
        return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert_job(job_id: str, fields: dict[str, Any]) -> None:
    """Best-effort background merge-write to worker_jobs/{job_id}. Never blocks the caller."""
    if not job_id:
        return
    snapshot = {**fields, "updatedAt": _now_iso()}

    def _write() -> None:
        try:
            db = _get_db()
            if db is None:
                return
            db.collection(WORKER_JOBS_COLLECTION).document(job_id).set(snapshot, merge=True)
            logger.debug("[firestore_state] upsert_job ok job_id=%s status=%s", job_id, fields.get("status"))
        except Exception as exc:  # noqa: BLE001
            logger.warning("[firestore_state] upsert_job failed job_id=%s: %s", job_id, exc)

    threading.Thread(target=_write, daemon=True).start()


def get_job(job_id: str) -> dict[str, Any] | None:
    """Read worker_jobs/{job_id}. Returns None if missing or on error."""
    if not job_id:
        return None
    try:
        db = _get_db()
        if db is None:
            return None
        doc = db.collection(WORKER_JOBS_COLLECTION).document(job_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("[firestore_state] get_job failed job_id=%s: %s", job_id, exc)
        return None
