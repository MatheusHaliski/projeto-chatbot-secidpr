from __future__ import annotations

import os
import threading
import time
from typing import Any
from urllib.parse import urlparse

import requests
from fastapi import FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from blender_common import finalize_job_status, normalize_status
from tester2d_pipeline import Tester2DPipeline, Tester2DRequest, Tester2DResponse

_inflight_pieces: set[str] = set()
_inflight_lock = threading.Lock()

GPU_WORKER_URL = os.getenv("GPU_WORKER_URL", "").strip()
RUNNING_AS_ORCHESTRATOR = bool(GPU_WORKER_URL)
GPU_WORKER_TOKEN = os.getenv("GPU_WORKER_TOKEN", "").strip()
REQUEST_TIMEOUT_MS = int(os.getenv("API_REQUEST_TIMEOUT_MS", "30000"))

if RUNNING_AS_ORCHESTRATOR:
    print(f"[startup] orchestrator mode enabled; GPU_WORKER_URL={GPU_WORKER_URL}")
else:
    print("[startup] worker mode enabled; GPU_WORKER_URL not required")


def _is_loopback(url: str) -> bool:
    host = urlparse(url).hostname
    return host in {"127.0.0.1", "localhost"}


if RUNNING_AS_ORCHESTRATOR and _is_loopback(GPU_WORKER_URL):
    raise RuntimeError("GPU_WORKER_URL cannot point to localhost in orchestrator mode.")

app = FastAPI(title="StylistAI Blender API Orchestrator", version="2.0.0")

TESTER2D_PIPELINE = Tester2DPipeline()

ALLOWED_ORIGINS = [
    "https://sai-tcc-2026.vercel.app",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.options("/{rest_of_path:path}")
async def options_handler(request: Request, rest_of_path: str):
    origin = request.headers.get("origin", "*")

    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400",
        },
    )


@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    origin = request.headers.get("origin")

    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"

    return response


class JobRequest(BaseModel):
    modelUrl: str | None = None
    imageUrl: str
    jobType: str = "blender_uv_pipeline"
    options: dict[str, Any] = Field(default_factory=dict)
    pieceId: str | None = None
    pieceName: str | None = None
    decalMode: str | None = None
    frontAxis: str | None = None
    decalPlacement: dict[str, Any] | None = None


class LbSubmitRequest(BaseModel):
    input: JobRequest


class SubmitResponse(BaseModel):
    jobId: str
    status: str


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "stylistai-blender-api", "status": "ok"}


@app.get("/health")
def health() -> dict[str, Any]:
    worker_reachable = False
    if RUNNING_AS_ORCHESTRATOR and GPU_WORKER_URL:
        try:
            response = requests.get(f"{GPU_WORKER_URL}/ping", timeout=5)
            worker_reachable = response.status_code == 200
        except requests.exceptions.RequestException:
            worker_reachable = False

    return {
        "status": "ok",
        "mode": "orchestrator" if RUNNING_AS_ORCHESTRATOR else "worker",
        "worker_url": GPU_WORKER_URL,
        "worker_reachable": worker_reachable,
        "requestTimeoutMs": REQUEST_TIMEOUT_MS,
    }


@app.get("/ping")
def ping() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def validate_worker():
    if not RUNNING_AS_ORCHESTRATOR:
        return

    try:
        res = requests.get(f"{GPU_WORKER_URL}/ping", timeout=5)
        print("[startup] worker ping:", res.status_code)
    except Exception as exc:
        print("[startup] WARNING: worker not reachable:", str(exc))


def _worker_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    if GPU_WORKER_TOKEN:
        headers["Authorization"] = f"Bearer {GPU_WORKER_TOKEN}"
    return headers


def _require_orchestrator_mode() -> None:
    if not RUNNING_AS_ORCHESTRATOR:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "ORCHESTRATOR_DISABLED",
                "message": "GPU_WORKER_URL is not configured; orchestrator endpoints are unavailable in worker mode.",
            },
        )


def _normalize_status_payload(job_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    artifacts = payload.get("artifacts") if isinstance(payload.get("artifacts"), dict) else {}
    error = payload.get("error")
    stage = payload.get("stage")
    normalized = finalize_job_status(payload.get("status", stage), artifacts, error)

    response: dict[str, Any] = {
        "jobId": job_id,
        "status": normalized,
    }
    if artifacts:
        response["artifacts"] = artifacts
    if isinstance(payload.get("metrics"), dict):
        response["metrics"] = payload["metrics"]
    if error:
        response["error"] = error
    if isinstance(payload.get("validation"), dict):
        response["validation"] = payload["validation"]
    if stage:
        response["stage"] = normalize_status(stage)
    return response




@app.post("/tester2d/process", response_model=Tester2DResponse)
def process_tester2d(payload: Tester2DRequest) -> Tester2DResponse:
    if not TESTER2D_PIPELINE.enable_v2:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "FEATURE_DISABLED",
                "message": "ENABLE_TESTER_2D_V2=false. Ative a flag para usar o pipeline redesign fit-realism.",
            },
        )

    try:
        return TESTER2D_PIPELINE.process(payload)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "ASSET_NOT_FOUND", "message": str(exc)}) from exc

@app.post("/submit", response_model=SubmitResponse)
def submit(payload: JobRequest, authorization: str | None = Header(default=None)) -> dict[str, str]:
    _require_orchestrator_mode()
    expected = os.getenv("API_ORCHESTRATOR_TOKEN", "").strip()
    if expected and authorization != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Invalid token."})

    if not payload.imageUrl.strip():
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "imageUrl is required."})

    if not GPU_WORKER_TOKEN:
        raise HTTPException(status_code=500, detail="GPU_WORKER_TOKEN is required")

    piece_key = payload.pieceId or ""
    piece_claimed = False
    if piece_key:
        with _inflight_lock:
            if piece_key in _inflight_pieces:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "JOB_ALREADY_INFLIGHT",
                        "message": f"A job for pieceId={piece_key!r} is already in progress.",
                    },
                )
            _inflight_pieces.add(piece_key)
            piece_claimed = True

    started = time.perf_counter()
    print(f"[ORCHESTRATOR] sending job to {GPU_WORKER_URL}")
    try:
        try:
            response = requests.post(
                f"{GPU_WORKER_URL}/jobs",
                json=payload.model_dump(),
                headers=_worker_headers(),
                timeout=15,
            )
        except requests.exceptions.Timeout as exc:
            raise HTTPException(status_code=504, detail="Worker timeout") from exc
        except requests.exceptions.ConnectionError as exc:
            raise HTTPException(status_code=502, detail="Worker unreachable") from exc
        except requests.exceptions.RequestException as exc:
            raise HTTPException(status_code=502, detail={"message": "Worker request error", "error": str(exc)}) from exc

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail={
                    "message": "Worker error",
                    "worker_status": response.status_code,
                    "worker_body": response.text[:1200],
                },
            )

        data = response.json()
        job_status = normalize_status(data.get("status"))
        _ = int((time.perf_counter() - started) * 1000)
        return {"jobId": str(data.get("jobId")), "status": job_status}
    finally:
        if piece_claimed:
            with _inflight_lock:
                _inflight_pieces.discard(piece_key)


@app.post("/")
def submit_lb(payload: LbSubmitRequest) -> dict[str, str]:
    result = submit(payload.input)
    return {
        "id": result["jobId"],
        "jobId": result["jobId"],
        "status": result["status"].upper(),
    }


@app.get("/status/{job_id}")
def status(job_id: str) -> dict[str, Any]:
    _require_orchestrator_mode()
    if not GPU_WORKER_TOKEN:
        raise HTTPException(status_code=500, detail="GPU_WORKER_TOKEN is required")

    try:
        response = requests.get(f"{GPU_WORKER_URL}/jobs/{job_id}", headers=_worker_headers(), timeout=15)
    except requests.exceptions.Timeout as exc:
        raise HTTPException(status_code=504, detail="Worker timeout") from exc
    except requests.exceptions.ConnectionError as exc:
        raise HTTPException(status_code=502, detail="Worker unreachable") from exc
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail={"message": "Worker request error", "error": str(exc)}) from exc

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Job not found."})
    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail={
                "message": "Worker error",
                "worker_status": response.status_code,
                "worker_body": response.text[:1200],
            },
        )

    payload = response.json()
    return _normalize_status_payload(job_id, payload)


@app.get("/jobs/{job_id}")
def status_compat(job_id: str) -> dict[str, Any]:
    return status(job_id)


@app.post("/jobs", response_model=SubmitResponse)
def submit_compat(payload: JobRequest) -> dict[str, str]:
    return submit(payload)


@app.get("/diagnostics")
def diagnostics() -> dict[str, Any]:
    diagnostics_payload: dict[str, Any] = {
        "service": "stylistai-blender-api",
        "workerBaseUrl": GPU_WORKER_URL,
        "runningAsOrchestrator": RUNNING_AS_ORCHESTRATOR,
        "workerAuthEnabled": bool(GPU_WORKER_TOKEN),
        "requestTimeoutMs": REQUEST_TIMEOUT_MS,
    }

    if not RUNNING_AS_ORCHESTRATOR:
        return diagnostics_payload

    try:
        response = requests.get(f"{GPU_WORKER_URL}/health", headers=_worker_headers(), timeout=15)
        diagnostics_payload["workerHealthStatus"] = response.status_code
        diagnostics_payload["workerHealthBody"] = response.json() if str(response.headers.get("content-type", "")).startswith("application/json") else response.text[:300]
    except requests.exceptions.RequestException as exc:
        diagnostics_payload["workerHealthStatus"] = None
        diagnostics_payload["workerHealthError"] = str(exc)

    return diagnostics_payload
