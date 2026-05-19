"""
handler.py — FastAPI worker entrypoint for the StylistAI Blender GPU Worker.

Responsibilities:
- Accept POST /jobs with a job payload
- Download the base GLB from Meshy (or use a provided URL)
- Run the Blender pipeline via controller.py
- Return the output GLB path (or upload URL) and job metadata
"""
from __future__ import annotations

import os
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from controller import run_blender_pipeline
from meshy_pipeline import MeshyPipeline, MeshyPipelineError


# ── Config ────────────────────────────────────────────────────────────────────

WORKER_TOKEN = os.getenv("BLENDER_WORKER_TOKEN", "").strip()
OUTPUT_ROOT = Path(os.getenv("BLENDER_OUTPUT_DIR", "/workspace/output"))
DOWNLOAD_TIMEOUT = int(os.getenv("DOWNLOAD_TIMEOUT_SECONDS", "120"))


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="StylistAI Blender GPU Worker", version="2.1.0")


# ── Models ────────────────────────────────────────────────────────────────────

class JobRequest(BaseModel):
    jobId: str | None = None
    modelUrl: str | None = None          # pre-built GLB URL (skip Meshy step)
    meshyTaskId: str | None = None       # Meshy task id (worker fetches GLB itself)
    meshyGlbUrl: str | None = None       # direct Meshy GLB download URL
    logoUrl: str | None = None           # optional logo/decal PNG URL
    frontAxis: str = "Y"                 # world axis facing the camera
    logoScale: float = 0.25
    logoOffsetV: float = 0.10
    # Legacy fields forwarded from orchestrator
    imageUrl: str | None = None
    pieceId: str | None = None
    options: dict[str, Any] = {}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _auth_check(authorization: str | None) -> None:
    if not WORKER_TOKEN:
        return
    if authorization != f"Bearer {WORKER_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def _download_file(url: str, dest: Path) -> None:
    """Stream-download a file from url to dest."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with httpx.stream("GET", url, timeout=DOWNLOAD_TIMEOUT, follow_redirects=True) as r:
        r.raise_for_status()
        with dest.open("wb") as f:
            for chunk in r.iter_bytes(chunk_size=65536):
                f.write(chunk)
    print(f"[handler] downloaded {url} → {dest} ({dest.stat().st_size:,} bytes)")


def _resolve_glb_url(payload: JobRequest) -> str | None:
    """Return a pre-built GLB download URL if one was explicitly provided."""
    return payload.meshyGlbUrl or payload.modelUrl


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root() -> dict[str, str]:
    return {"service": "stylistai-blender-worker", "status": "ok"}


@app.get("/ping")
def ping() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health")
def health() -> dict[str, Any]:
    blender_bin = os.getenv("BLENDER_BIN", "blender")
    blender_exists = Path(blender_bin).exists() if "/" in blender_bin else True
    return {
        "status": "ok",
        "blender_bin": blender_bin,
        "blender_bin_exists": blender_exists,
        "pyopengl_platform": os.getenv("PYOPENGL_PLATFORM", ""),
        "libgl_always_software": os.getenv("LIBGL_ALWAYS_SOFTWARE", ""),
        "output_root": str(OUTPUT_ROOT),
    }


@app.post("/jobs")
def create_job(
    payload: JobRequest,
    authorization: str | None = Header(default=None),
) -> JSONResponse:
    _auth_check(authorization)

    job_id = payload.jobId or str(uuid.uuid4())
    job_dir = OUTPUT_ROOT / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    started = time.perf_counter()

    # ── Step 1: resolve / download the input GLB ─────────────────────────
    #
    # Three accepted flows (in priority order):
    #   A. meshyGlbUrl / modelUrl provided  → download directly
    #   B. imageUrl provided                → call Meshy image-to-3d, then download
    #   C. neither                          → 400 error
    input_glb = job_dir / "base_meshy.glb"

    glb_url = _resolve_glb_url(payload)

    if glb_url:
        # Flow A: pre-built GLB URL
        try:
            print(f"[handler] downloading GLB from provided URL: {glb_url}")
            _download_file(glb_url, input_glb)
        except Exception as exc:
            return JSONResponse(
                status_code=502,
                content={
                    "ok": False,
                    "jobId": job_id,
                    "error": f"Failed to download GLB: {exc}",
                    "glbUrl": glb_url,
                },
            )

    elif payload.imageUrl:
        # Flow B: generate GLB from image via Meshy, then run Blender
        print(f"[handler] no GLB URL provided — generating from imageUrl via Meshy")
        piece_type = str((payload.options or {}).get("pieceType") or "upper_piece")
        try:
            meshy = MeshyPipeline()
            meshy_output = meshy.generate_base_model(
                piece_type=piece_type,
                source_image_url=payload.imageUrl,
                output_dir=job_dir,
            )
            input_glb = meshy_output.base_model_path
            print(f"[handler] Meshy generation done task_id={meshy_output.meshy_task_id} path={input_glb}")
        except MeshyPipelineError as exc:
            return JSONResponse(
                status_code=502,
                content={
                    "ok": False,
                    "jobId": job_id,
                    "stage": "meshy_generate",
                    "error": exc.message,
                    "code": exc.code,
                    "details": exc.details,
                },
            )
        except Exception as exc:
            return JSONResponse(
                status_code=502,
                content={
                    "ok": False,
                    "jobId": job_id,
                    "stage": "meshy_generate",
                    "error": f"Unexpected error during Meshy generation: {exc}",
                },
            )

    else:
        # Flow C: nothing usable provided
        return JSONResponse(
            status_code=400,
            content={
                "ok": False,
                "jobId": job_id,
                "error": "No GLB URL and no imageUrl provided. Supply meshyGlbUrl, modelUrl, or imageUrl.",
            },
        )

    # ── Step 2: optionally download logo ─────────────────────────────────
    logo_path: str | None = None
    if payload.logoUrl:
        logo_dest = job_dir / "logo.png"
        try:
            _download_file(payload.logoUrl, logo_dest)
            logo_path = str(logo_dest)
        except Exception as exc:
            print(f"[handler] WARNING: failed to download logo ({exc}) — skipping decal")

    # ── Step 3: run Blender pipeline ──────────────────────────────────────
    output_glb = job_dir / "final_model.glb"

    extra_args: dict[str, Any] = {
        "front-axis": payload.frontAxis,
        "logo-scale": payload.logoScale,
        "logo-offset-v": payload.logoOffsetV,
    }
    if logo_path:
        extra_args["logo-path"] = logo_path

    result = run_blender_pipeline(
        input_model_path=str(input_glb),
        output_model_path=str(output_glb),
        extra_args=extra_args,
    )

    elapsed_ms = int((time.perf_counter() - started) * 1000)

    if not result["success"]:
        error_body: dict[str, Any] = {
            "ok": False,
            "jobId": job_id,
            "stage": "blender_pipeline",
            "error": "Blender pipeline failed",
            "exitCode": result["exit_code"],
            "elapsedMs": elapsed_ms,
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "command": result["command"],
        }
        if result.get("hint"):
            error_body["hint"] = result["hint"]

        return JSONResponse(status_code=500, content=error_body)

    # ── Step 4: respond with success ──────────────────────────────────────
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "jobId": job_id,
            "stage": "completed",
            "status": "completed",
            "artifacts": {
                "final_model_glb": str(output_glb),
            },
            "metrics": {
                "totalMs": elapsed_ms,
                "blenderMs": result["elapsed_ms"],
            },
        },
    )
