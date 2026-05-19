# StylistAI GPU Worker Runtime

This folder contains the heavy GPU worker runtime.

## Responsibilities
- execute Fashion AI v2 mesh generation pipeline (MeshyAI → Blender)
- generate base garment mesh by piece type (shirt/pants/jacket/etc.)
- apply visual details from Fashion AI data (color, fabric metadata, logo/pattern references)
- export web-ready artifacts to persistent volume path (`/workspace/output`)
- expose structured job status and diagnostics

## Base image
- `runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404`

## Endpoints
- `GET /health`
- `GET /ping`
- `GET /diagnostics`
- `POST /jobs` (also `POST /` for LB payload)
- `GET /jobs/{jobId}` (also `GET /status/{jobId}`)

## Pipeline stages
1. `meshy_pipeline.py`: creates MeshyAI task and downloads base `.glb`/`.obj`.
2. `blender_pipeline.py`: runs Blender headless script (`bpy`) to apply material/detail metadata and exports final `.glb` (+ `.usdz` placeholder).
3. `controller.py`: orchestrates complete flow with step-level logging and writes debug JSON.
4. `handler.py`: async job API for RunPod worker, persisting outputs under `/workspace/output/<jobId>`.

## Core scripts
- `meshy_pipeline.py`
- `blender_pipeline.py`
- `controller.py`
- `handler.py`

## Failure classes
- Meshy task creation/polling failure (`MeshyPipelineError`)
- Blender headless execution failure (`RuntimeError` with stdout/stderr tail)
- Generic job processing failure (`processing_error`)

## Meshy endpoint
- Garment generation uses image-based flow:
  - `MESHY_BASE_URL=https://api.meshy.ai`
  - `MESHY_IMAGE_TO_3D_PATH=/openapi/v1/image-to-3d`
- Optional diagnostics/testing override:
  - `MESHY_TEST_IMAGE_URL=<public-image-url>`

## Startup behavior
Container default command:

```bash
/usr/local/bin/runpod-worker-bootstrap.sh
```

Bootstrap supports no-heavy-rebuild flows:

- `WORKER_CODE_SYNC_DIR=/runpod-volume/stylistai-worker`
- `WORKER_CODE_SYNC_GIT=https://github.com/<org>/<repo>.git`
- `WORKER_CODE_SYNC_REF=main`

Then launches:

```bash
python -m uvicorn handler:app --host 0.0.0.0 --port 8000 --log-level info
```
