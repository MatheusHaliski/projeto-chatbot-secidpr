from __future__ import annotations

import importlib
import logging
import os
import socket
import subprocess
import sys
from pathlib import Path


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("stylistai.startup")

_DNS_PROBE_HOSTS = [
    "google.com",
    "firebasestorage.googleapis.com",
    "api.meshy.ai",
]
_RESOLV_CONF = Path("/etc/resolv.conf")
_FALLBACK_RESOLV = "nameserver 1.1.1.1\nnameserver 8.8.8.8\noptions timeout:2 attempts:3 rotate\n"


def _probe_dns(hosts: list[str]) -> list[str]:
    """Return list of hosts that could NOT be resolved."""
    failed: list[str] = []
    for host in hosts:
        try:
            socket.getaddrinfo(host, None)
            logger.info("dns_probe ok host=%s", host)
        except OSError as exc:
            logger.warning("dns_probe failed host=%s err=%s", host, exc)
            failed.append(host)
    return failed


def _rewrite_resolv_conf() -> None:
    try:
        _RESOLV_CONF.write_text(_FALLBACK_RESOLV, encoding="utf-8")
        logger.info("dns_heal wrote fallback resolv.conf path=%s", _RESOLV_CONF)
    except OSError as exc:
        logger.error("dns_heal could not write %s: %s", _RESOLV_CONF, exc)


def check_and_heal_dns() -> None:
    """
    Test DNS before uvicorn starts. If resolution fails, rewrite /etc/resolv.conf
    with public resolvers and re-test. Exits with code 1 if DNS is still broken.
    """
    logger.info("dns_preflight starting probes=%s", _DNS_PROBE_HOSTS)
    failed = _probe_dns(_DNS_PROBE_HOSTS)
    if not failed:
        for host in _DNS_PROBE_HOSTS:
            logger.info("[bootstrap] dns_ok host=%s", host)
        return

    logger.warning("dns_preflight failed hosts=%s — rewriting resolv.conf", failed)
    _rewrite_resolv_conf()

    # Clear the OS-level resolver cache by forcing a fresh lookup after the rewrite.
    # Python's socket module caches nothing itself, but we give the kernel a moment.
    import time
    time.sleep(1)

    failed_after = _probe_dns(_DNS_PROBE_HOSTS)
    if not failed_after:
        for host in _DNS_PROBE_HOSTS:
            logger.info("[bootstrap] dns_ok host=%s", host)
        return

    for host in failed_after:
        logger.error("[bootstrap] dns_failed host=%s", host)
    logger.warning("dns_preflight continuing startup despite DNS probe failures")


def verify_runtime() -> None:
    cwd = Path.cwd()
    handler_path = cwd / "handler.py"
    logger.info("startup_check cwd=%s", cwd)

    if not handler_path.exists():
        raise FileNotFoundError(f"Missing handler.py in working directory: {handler_path}")
    logger.info("startup_check handler.py found at %s", handler_path)

    handler_module = importlib.import_module("handler")
    if not hasattr(handler_module, "app"):
        raise AttributeError("handler.py does not export a FastAPI variable named `app`.")
    logger.info("startup_check handler:app export is present")

    importlib.import_module("fastapi")
    importlib.import_module("uvicorn")
    logger.info("startup_check fastapi and uvicorn imports succeeded")




def _log_blender_diagnostics() -> None:
    checks = [
        "test -x /usr/bin/blender && echo '/usr/bin/blender exists' || echo '/usr/bin/blender missing'",
        "blender --version",
        "ldconfig -p | grep libEGL",
        "ldconfig -p | grep libGL",
        "echo $PYOPENGL_PLATFORM",
        "echo $LIBGL_ALWAYS_SOFTWARE",
    ]
    for cmd in checks:
        proc = subprocess.run(["bash", "-lc", cmd], capture_output=True, text=True, check=False)
        logger.info("blender_diag cmd=%s rc=%s", cmd, proc.returncode)
        if proc.stdout.strip():
            logger.info("blender_diag stdout=%s", proc.stdout.strip())
        if proc.stderr.strip():
            logger.info("blender_diag stderr=%s", proc.stderr.strip())

def run_uvicorn() -> int:
    host = "0.0.0.0"
    port = os.getenv("PORT", "8000")
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "handler:app",
        "--host",
        host,
        "--port",
        port,
        "--log-level",
        "info",
    ]
    logger.info("starting_uvicorn command=%s", " ".join(cmd))
    process = subprocess.run(cmd, check=False)
    return process.returncode


if __name__ == "__main__":
    try:
        check_and_heal_dns()
        verify_runtime()
        _log_blender_diagnostics()
        rc = run_uvicorn()
        if rc != 0:
            logger.error("uvicorn exited with status=%s", rc)
        sys.exit(rc)
    except Exception:
        logger.exception("startup_failed before uvicorn boot")
        sys.exit(1)
