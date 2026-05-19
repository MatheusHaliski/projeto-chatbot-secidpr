# StylistAI API/orchestrator image (lightweight)
FROM --platform=linux/amd64 runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libegl1 \
    libegl-mesa0 \
    libgl1-mesa-dri \
    libgles2 \
    && rm -rf /var/lib/apt/lists/*

COPY blender-api/requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

COPY blender-api/app.py /app/app.py
COPY blender_common /app/blender_common

COPY blender-api/tester2d_pipeline.py /app/

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]