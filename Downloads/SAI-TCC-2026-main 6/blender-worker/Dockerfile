FROM --platform=linux/amd64 runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    WORKER_OUTPUT_DIR=/workspace/output \
    PYOPENGL_PLATFORM=egl \
    LIBGL_ALWAYS_SOFTWARE=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    blender \
    git \
    python3 \
    python3-pip \
    libegl1 \
    libgl1 \
    libgles2 \
    libglx0 \
    libglvnd0 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxi6 \
    libxxf86vm1 \
    libsm6 \
    libice6 \
    libglib2.0-0 \
    libgomp1 \
    mesa-utils \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY blender-worker/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && pip install -r /tmp/requirements.txt

COPY blender-worker/handler.py /app/handler.py
COPY blender-worker/controller.py /app/controller.py
COPY blender-worker/meshy_pipeline.py /app/meshy_pipeline.py
COPY blender-worker/blender_pipeline.py /app/blender_pipeline.py
COPY blender-worker/blender-scripts /app/blender-scripts

# 🔥 ESSENCIAL
COPY blender_common /app/blender_common

COPY scripts/runpod-worker-bootstrap.sh /usr/local/bin/runpod-worker-bootstrap.sh
RUN chmod +x /usr/local/bin/runpod-worker-bootstrap.sh

VOLUME ["/workspace/output"]

CMD ["/usr/local/bin/runpod-worker-bootstrap.sh"]
