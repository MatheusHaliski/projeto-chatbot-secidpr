#!/bin/bash
set -e

echo "[bootstrap] Starting StylistAI Blender GPU Worker..."

cd /app

# Start the FastAPI handler with uvicorn
uvicorn handler:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 1 \
  --loop uvloop

echo "[bootstrap] Worker started"
