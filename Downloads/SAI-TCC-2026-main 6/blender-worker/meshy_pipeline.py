from __future__ import annotations

import logging
import os
import time
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import re

import requests

logger = logging.getLogger("stylistai.meshy_pipeline")


def _redact_url_token(url: str) -> str:
    return re.sub(r"([?&]token=)[^&\s]+", r"\1***REDACTED***", url)

MESHY_BASE_URL = os.getenv("MESHY_BASE_URL", "https://api.meshy.ai")
MESHY_IMAGE_TO_3D_PATH = os.getenv("MESHY_IMAGE_TO_3D_PATH", "/openapi/v1/image-to-3d")
MESHY_POLL_DELAY_SECONDS = float(os.getenv("MESHY_POLL_DELAY_SECONDS", "3"))
MESHY_MAX_POLL_ATTEMPTS = int(os.getenv("MESHY_MAX_POLL_ATTEMPTS", "80"))
MESHY_NETWORK_RETRIES = int(os.getenv("MESHY_NETWORK_RETRIES", "3"))
MESHY_NETWORK_RETRY_BASE_SECONDS = float(os.getenv("MESHY_NETWORK_RETRY_BASE_SECONDS", "1.5"))
MESHY_TEST_IMAGE_URL = os.getenv("MESHY_TEST_IMAGE_URL", "").strip()
MESHY_VALID_CREATE_FIELDS = {
    "image_url",
    "model_type",
    "ai_model",
    "should_texture",
    "enable_pbr",
    "texture_prompt",
    "texture_image_url",
    "should_remesh",
    "topology",
    "target_polycount",
    "decimation_mode",
    "save_pre_remeshed_model",
    "symmetry_mode",
    "pose_mode",
    "is_a_t_pose",
    "image_enhancement",
    "remove_lighting",
    "moderation",
    "target_formats",
    "auto_size",
    "origin_at",
}


@dataclass
class MeshyOutput:
    base_model_path: Path
    format: str
    meshy_task_id: str
    model_url: str
    metadata: dict[str, Any]


class MeshyPipelineError(RuntimeError):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


class MeshyPipeline:
    def __init__(self, *, api_key: str | None = None, timeout_seconds: int = 45):
        self.api_key = (api_key or os.getenv("MESHY_API_KEY", "")).strip()
        self.timeout_seconds = timeout_seconds
        self.create_url = self._build_url(MESHY_IMAGE_TO_3D_PATH)
        logger.info("[meshy] initialized create_url=%s", self.create_url)

    def generate_base_model(
        self,
        *,
        piece_type: str,
        source_image_url: str | None,
        output_dir: Path,
        preferred_format: str = "glb",
    ) -> MeshyOutput:
        if not self.api_key:
            raise MeshyPipelineError("meshy_auth_not_configured", "MESHY_API_KEY is required.")
        if not source_image_url:
            raise MeshyPipelineError("meshy_invalid_request", "source image URL is required for image-to-3d flow.")

        output_dir.mkdir(parents=True, exist_ok=True)
        fmt = "obj" if preferred_format.lower() == "obj" else "glb"

        logger.info("[meshy] create url=%s", self.create_url)
        task_id = self._create_task(image_url=source_image_url, piece_type=piece_type)
        task = self._wait_for_completion(task_id)

        model_url = (
            task.get("model_urls", {}).get(fmt)
            or task.get("model_urls", {}).get("glb")
            or task.get("model_urls", {}).get("obj")
        )
        if not model_url:
            raise MeshyPipelineError(
                "meshy_provider_invalid_response",
                f"Meshy task {task_id} finished without model URLs.",
                {"taskId": task_id, "response": task},
            )

        base_path = output_dir / f"base_meshy.{fmt}"
        self._download(model_url, base_path)

        metadata = {
            "task_id": task_id,
            "status": task.get("status"),
            "thumbnail_url": task.get("thumbnail_url"),
            "preview_url": task.get("preview_url"),
            "resolved_format": fmt,
            "create_url": self.create_url,
        }
        logger.info("[meshy] base model ready task_id=%s path=%s", task_id, base_path)
        return MeshyOutput(base_model_path=base_path, format=fmt, meshy_task_id=task_id, model_url=model_url, metadata=metadata)

    @staticmethod
    def build_meshy_create_url(base_url: str) -> str:
        base = (base_url or "https://api.meshy.ai").strip().rstrip("/")
        base = base.replace("/openapi/v1/image-to-3d", "")
        base = base.replace("/openapi/v1", "")
        return f"{base}/openapi/v1/image-to-3d"

    def _build_url(self, _path: str) -> str:
        return self.build_meshy_create_url(MESHY_BASE_URL)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _safe_log_headers(self) -> dict[str, str]:
        return {
            "Authorization": "Bearer ***REDACTED***",
            "Content-Type": "application/json",
        }

    def _request_with_retry(self, method: str, url: str, **kwargs: Any) -> requests.Response:
        transient_error: Exception | None = None
        failure_kind = "network_failure"
        for attempt in range(1, MESHY_NETWORK_RETRIES + 2):
            try:
                return requests.request(method, url, timeout=self.timeout_seconds, **kwargs)
            except requests.exceptions.Timeout as exc:
                raise MeshyPipelineError("meshy_timeout", "Meshy request timed out.", {"url": url, "attempt": attempt}) from exc
            except requests.exceptions.ConnectionError as exc:
                transient_error = exc
                error_text = str(exc).lower()
                if "name resolution" in error_text or "failed to resolve" in error_text or "nodename nor servname provided" in error_text:
                    failure_kind = "dns_resolution_failure"
                    # DNS failures are not transient in the way a connection reset is —
                    # retrying immediately after a DNS failure rarely helps, but we still
                    # attempt MESHY_NETWORK_RETRIES times in case the resolver recovers.
                else:
                    failure_kind = "network_connection_failure"
                if attempt > MESHY_NETWORK_RETRIES:
                    break
                wait_seconds = MESHY_NETWORK_RETRY_BASE_SECONDS * (2 ** (attempt - 1))
                logger.warning("[meshy] temporary network failure url=%s attempt=%s retry_in=%ss err=%s", url, attempt, wait_seconds, exc)
                time.sleep(wait_seconds)

        if failure_kind == "dns_resolution_failure":
            raise MeshyPipelineError(
                "dns_resolution_failure",
                f"DNS resolution failed for {url}. The container cannot reach the external network. "
                "Check /etc/resolv.conf or restart the container to trigger DNS self-healing.",
                {
                    "url": url,
                    "kind": "dns_resolution_failure",
                    "failedStage": "network_dns",
                    "retryable": True,
                    "error": str(transient_error) if transient_error else "dns_resolution_failure",
                },
            ) from transient_error

        raise MeshyPipelineError(
            "meshy_temporarily_unavailable",
            "Meshy service temporarily unavailable. Please retry.",
            {
                "url": url,
                "kind": failure_kind,
                "failedStage": "network_connection",
                "retryable": True,
                "error": str(transient_error) if transient_error else "network_failure",
            },
        ) from transient_error

    def _create_task(self, *, image_url: str, piece_type: str) -> str:
        effective_image_url = MESHY_TEST_IMAGE_URL or image_url
        if MESHY_TEST_IMAGE_URL:
            logger.warning("[meshy] overriding image_url with MESHY_TEST_IMAGE_URL for diagnostics")

        self._validate_image_url_public(effective_image_url)

        payload = {"image_url": effective_image_url}
        self._validate_create_payload_schema(payload)
        headers = self._headers()
        logger.info("[meshy] create request headers=%s body=%s", json.dumps(self._safe_log_headers(), sort_keys=True), json.dumps(payload, sort_keys=True))
        response = self._request_with_retry("POST", self.create_url, headers=headers, json=payload)
        logger.info(
            "[meshy] create response status=%s headers=%s body=%s",
            response.status_code,
            json.dumps(dict(response.headers), sort_keys=True),
            response.text,
        )

        if response.status_code in {401, 403}:
            raise MeshyPipelineError("meshy_auth_failed", "Meshy authentication failed (401/403).", {"url": self.create_url, "status": response.status_code, "body": response.text})
        if response.status_code == 404 and "/openapi/v1/openapi/v1" in self.create_url:
            raise MeshyPipelineError(
                "meshy_endpoint_misconfigured",
                "MESHY_BASE_URL is duplicating /openapi/v1. Use https://api.meshy.ai or normalize the URL builder.",
                {"url": self.create_url, "failedStage": "meshy_submit", "hint": "MESHY_BASE_URL is duplicating /openapi/v1. Use https://api.meshy.ai or normalize the URL builder."},
            )
        if 400 <= response.status_code < 500:
            message = "Meshy rejected request payload. Verify image URL is publicly reachable and request fields are valid."
            raise MeshyPipelineError(
                "meshy_bad_request",
                message,
                {"url": self.create_url, "status": response.status_code, "body": response.text, "pieceType": piece_type, "requestPayload": payload},
            )
        if response.status_code >= 500:
            raise MeshyPipelineError("meshy_provider_error", "Meshy provider error.", {"url": self.create_url, "status": response.status_code, "body": response.text})

        payload_json = response.json()
        task_id = str(payload_json.get("result") or payload_json.get("id") or "").strip()
        if not task_id:
            raise MeshyPipelineError("meshy_provider_invalid_response", "Meshy did not return a task id.", {"url": self.create_url, "response": payload_json})
        return task_id

    def _validate_create_payload_schema(self, payload: dict[str, Any]) -> None:
        image_url = str(payload.get("image_url", "")).strip()
        if not image_url:
            raise MeshyPipelineError("meshy_invalid_request", "Meshy image-to-3d requires 'image_url'.", {"payload": payload})
        unknown_fields = sorted(key for key in payload if key not in MESHY_VALID_CREATE_FIELDS)
        if unknown_fields:
            raise MeshyPipelineError(
                "meshy_invalid_request",
                "Meshy image-to-3d payload has unsupported fields.",
                {"unknownFields": unknown_fields, "payload": payload},
            )
        if "prompt" in payload:
            raise MeshyPipelineError(
                "meshy_invalid_request",
                "Field 'prompt' belongs to text-to-3d and must not be sent to image-to-3d.",
                {"payload": payload},
            )

    def _validate_image_url_public(self, image_url: str) -> None:
        if image_url.startswith("data:image/"):
            return
        parsed = urlparse(image_url)
        if parsed.scheme not in {"http", "https"}:
            raise MeshyPipelineError(
                "meshy_invalid_request",
                "Input image URL must be http(s) or data URI.",
                {"imageUrl": image_url, "scheme": parsed.scheme},
            )

        is_firebase_storage = parsed.netloc.endswith("firebasestorage.googleapis.com")
        query_params = parse_qs(parsed.query)
        logger.info("[meshy] validating image_url accessibility url=%s host=%s firebase=%s", _redact_url_token(image_url), parsed.netloc, is_firebase_storage)
        if is_firebase_storage:
            safe_params = {k: ("***REDACTED***" if k == "token" else v) for k, v in query_params.items()}
            logger.info("[meshy] firebase image_url query params=%s", json.dumps(safe_params, sort_keys=True))

        if is_firebase_storage and "token" not in query_params:
            logger.warning(
                "[meshy] firebase storage url has no token query parameter; it may not be publicly downloadable by Meshy. url=%s",
                image_url,
            )

        try:
            response = requests.head(image_url, allow_redirects=True, timeout=self.timeout_seconds)
            logger.info("[meshy] image_url head status=%s headers=%s", response.status_code, json.dumps(dict(response.headers), sort_keys=True))
            if response.status_code in {405, 403}:
                logger.info("[meshy] image_url head returned status=%s, retrying with GET bytes probe", response.status_code)
                response = requests.get(
                    image_url,
                    allow_redirects=True,
                    timeout=self.timeout_seconds,
                    stream=True,
                    headers={"Range": "bytes=0-0"},
                )
                logger.info("[meshy] image_url get_probe status=%s headers=%s", response.status_code, json.dumps(dict(response.headers), sort_keys=True))
            if response.status_code >= 400:
                raise MeshyPipelineError(
                    "meshy_input_image_unreachable",
                    "Input image URL is not publicly reachable for Meshy provider.",
                    {
                        "imageUrl": image_url,
                        "status": response.status_code,
                        "responseHeaders": dict(response.headers),
                        "isFirebaseStorage": is_firebase_storage,
                    },
                )
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
            error_text = str(exc).lower()
            is_dns_failure = (
                "name resolution" in error_text
                or "failed to resolve" in error_text
                or "nodename nor servname provided" in error_text
            )
            if is_dns_failure:
                # DNS is broken on this pod — Meshy's servers will also be unable to
                # download the Firebase Storage image, so fail now rather than wasting
                # the task submission.
                raise MeshyPipelineError(
                    "dns_resolution_failure",
                    f"DNS resolution failed while probing input image URL. "
                    "The container cannot resolve external hostnames. "
                    "Restart the container to trigger DNS self-healing.",
                    {
                        "imageUrl": _redact_url_token(image_url),
                        "kind": "dns_resolution_failure",
                        "failedStage": "network_dns",
                        "retryable": True,
                        "errorCode": "DNS_RESOLUTION_FAILED",
                        "error": str(exc),
                    },
                ) from exc
            # Non-DNS network failure (e.g. connection refused, timeout) —
            # the pod may simply lack direct outbound access to Firebase Storage
            # while Meshy's own servers can still reach the URL.
            logger.warning(
                "[meshy] image_url probe failed (non-DNS network error from pod) — skipping validation url=%s err=%s",
                _redact_url_token(image_url),
                str(exc),
            )
        except requests.exceptions.RequestException as exc:
            raise MeshyPipelineError(
                "meshy_input_image_unreachable",
                "Input image URL is not publicly reachable for Meshy provider.",
                {"imageUrl": image_url, "error": str(exc)},
            ) from exc

    def _wait_for_completion(self, task_id: str) -> dict[str, Any]:
        status = "unknown"
        poll_url = f"{self.build_meshy_create_url(MESHY_BASE_URL)}/{task_id}"
        logger.info("[meshy] poll url=%s", poll_url)

        for attempt in range(1, MESHY_MAX_POLL_ATTEMPTS + 1):
            response = self._request_with_retry("GET", poll_url, headers={"Authorization": f"Bearer {self.api_key}"})

            if response.status_code in {401, 403}:
                raise MeshyPipelineError("meshy_auth_failed", "Meshy authentication failed during polling (401/403).", {"url": poll_url, "status": response.status_code, "body": response.text[:500]})
            if 400 <= response.status_code < 500:
                raise MeshyPipelineError("meshy_bad_request", "Meshy polling request rejected.", {"url": poll_url, "status": response.status_code, "body": response.text[:500]})
            if response.status_code >= 500:
                raise MeshyPipelineError("meshy_provider_error", "Meshy provider error during polling.", {"url": poll_url, "status": response.status_code, "body": response.text[:500]})

            payload = response.json()
            status = str(payload.get("status", "")).strip().lower() or status
            logger.info("[meshy] poll task_id=%s attempt=%s/%s status=%s", task_id, attempt, MESHY_MAX_POLL_ATTEMPTS, status)

            if status in {"succeeded", "success", "completed"}:
                return payload
            if status in {"failed", "error", "cancelled"}:
                raise MeshyPipelineError("meshy_task_failed", f"Meshy task {task_id} finished with status={status}.", {"taskId": task_id, "status": status})

            time.sleep(MESHY_POLL_DELAY_SECONDS)

        raise MeshyPipelineError("meshy_timeout", f"Meshy task timed out before completion. Last status={status}.", {"taskId": task_id, "status": status})

    def _download(self, url: str, destination: Path) -> None:
        logger.info("[meshy] download url=%s", url)
        response = self._request_with_retry("GET", url)
        if response.status_code in {401, 403}:
            raise MeshyPipelineError("meshy_auth_failed", "Meshy asset download auth failed (401/403).", {"url": url, "status": response.status_code, "body": response.text[:500]})
        if 400 <= response.status_code < 500:
            raise MeshyPipelineError("meshy_bad_request", "Meshy asset download request rejected.", {"url": url, "status": response.status_code, "body": response.text[:500]})
        if response.status_code >= 500:
            raise MeshyPipelineError("meshy_provider_error", "Meshy provider error during asset download.", {"url": url, "status": response.status_code, "body": response.text[:500]})
        destination.write_bytes(response.content)
