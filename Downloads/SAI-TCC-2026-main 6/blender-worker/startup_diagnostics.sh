#!/bin/bash
# startup_diagnostics.sh — runs at container boot, logs blender/EGL environment

echo "========================================="
echo "[diagnostics] StylistAI Blender Worker"
echo "========================================="

echo ""
echo "--- Blender binary ---"
if [ -f /usr/bin/blender ]; then
    echo "[ok] /usr/bin/blender exists"
    /usr/bin/blender --version 2>&1 | head -5
else
    echo "[warn] /usr/bin/blender NOT found — Blender may be installed elsewhere"
    which blender && blender --version 2>&1 | head -5 || echo "[error] blender not in PATH"
fi

echo ""
echo "--- EGL libraries ---"
ldconfig -p | grep -i libEGL || echo "[warn] libEGL not found in ldconfig cache"

echo ""
echo "--- OpenGL libraries ---"
ldconfig -p | grep -i libGL || echo "[warn] libGL not found in ldconfig cache"

echo ""
echo "--- Environment variables ---"
echo "PYOPENGL_PLATFORM=${PYOPENGL_PLATFORM:-<not set>}"
echo "LIBGL_ALWAYS_SOFTWARE=${LIBGL_ALWAYS_SOFTWARE:-<not set>}"
echo "DISPLAY=${DISPLAY:-<not set>}"

echo ""
echo "--- /dev/dri (GPU devices) ---"
ls -la /dev/dri 2>/dev/null || echo "[info] /dev/dri not available (software rendering will be used)"

echo ""
echo "--- Python ---"
python --version 2>&1

echo "========================================="
echo "[diagnostics] done — starting uvicorn"
echo "========================================="
