"""
controller.py — Blender subprocess controller for the StylistAI worker.

Improvements over previous version:
- Returns full stderr/stdout (truncated) on failure
- Returns exitCode and the exact command that was run
- Provides a clear actionable hint when libEGL is missing
"""
from __future__ import annotations

import os
import shlex
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any


BLENDER_BIN = os.getenv("BLENDER_BIN", "blender")
BLENDER_PIPELINE_SCRIPT = Path(__file__).with_name("blender_pipeline.py")

# Truncation limit for stdout/stderr in error payloads (characters)
_OUTPUT_LIMIT = 2000


def _truncate(text: str, limit: int = _OUTPUT_LIMIT) -> str:
    if len(text) <= limit:
        return text
    half = limit // 2
    return text[:half] + f"\n... [{len(text) - limit} chars omitted] ...\n" + text[-half:]


def _detect_hint(stderr: str, stdout: str) -> str | None:
    """Return a human-readable hint for known failure signatures."""
    combined = (stderr + stdout).lower()

    if "libegl.so.1" in combined or "couldn't open libegl" in combined:
        return (
            "libEGL.so.1 is missing. "
            "Add the following to your Dockerfile and rebuild: "
            "apt-get install -y libegl1 libegl-mesa0 libgl1 libgles2 libglvnd0 && ldconfig. "
            "Also set ENV PYOPENGL_PLATFORM=egl and ENV LIBGL_ALWAYS_SOFTWARE=1."
        )

    if "libgl.so.1" in combined or "couldn't open libgl" in combined:
        return (
            "libGL.so.1 is missing. "
            "Add to Dockerfile: apt-get install -y libgl1 libglvnd0 && ldconfig."
        )

    if "no module named" in combined:
        missing = [
            line for line in (stderr + stdout).splitlines()
            if "No module named" in line
        ]
        if missing:
            return f"Python import error inside Blender: {missing[0].strip()}"

    if "python" in combined and "importerror" in combined:
        return "A Python ImportError occurred inside the Blender process. Check blender_pipeline.py dependencies."

    return None


def run_blender_pipeline(
    input_model_path: str,
    output_model_path: str,
    extra_args: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Run blender_pipeline.py as a subprocess.

    Returns a dict with:
      - success: bool
      - output_path: str | None
      - elapsed_ms: int
      - stdout: str (truncated)
      - stderr: str (truncated)
      - exit_code: int
      - command: list[str]
      - hint: str | None  — actionable message for known failure modes
    """
    extra_args = extra_args or {}

    cmd: list[str] = [
        BLENDER_BIN,
        "--background",
        "--python", str(BLENDER_PIPELINE_SCRIPT),
        "--",
        "--input-model", input_model_path,
        "--output-model", output_model_path,
    ]

    # Forward optional extra arguments
    for key, value in extra_args.items():
        cmd.extend([f"--{key}", str(value)])

    started = time.perf_counter()

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=int(os.getenv("BLENDER_TIMEOUT_SECONDS", "300")),
        )
    except subprocess.TimeoutExpired as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        stdout = _truncate(exc.stdout or "")
        stderr = _truncate(exc.stderr or "")
        return {
            "success": False,
            "output_path": None,
            "elapsed_ms": elapsed_ms,
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": -1,
            "command": cmd,
            "hint": "Blender timed out. Increase BLENDER_TIMEOUT_SECONDS or check for infinite loops in blender_pipeline.py.",
        }
    except FileNotFoundError:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        return {
            "success": False,
            "output_path": None,
            "elapsed_ms": elapsed_ms,
            "stdout": "",
            "stderr": f"Blender binary not found at: {BLENDER_BIN}",
            "exit_code": -1,
            "command": cmd,
            "hint": f"Install Blender and make sure it is available at '{BLENDER_BIN}', or set the BLENDER_BIN environment variable.",
        }

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    stdout = _truncate(result.stdout or "")
    stderr = _truncate(result.stderr or "")
    exit_code = result.returncode

    if exit_code != 0:
        hint = _detect_hint(stderr, stdout)
        return {
            "success": False,
            "output_path": None,
            "elapsed_ms": elapsed_ms,
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": exit_code,
            "command": cmd,
            "hint": hint,
        }

    output_exists = Path(output_model_path).exists()
    if not output_exists:
        return {
            "success": False,
            "output_path": None,
            "elapsed_ms": elapsed_ms,
            "stdout": stdout,
            "stderr": stderr,
            "exit_code": exit_code,
            "command": cmd,
            "hint": "Blender exited successfully but the output file was not created. Check blender_pipeline.py export logic.",
        }

        logger.info("[controller] running blender command=%s", " ".join(command))
        completed = subprocess.run(command, capture_output=True, text=True)
        blender_stdout_path = debug_dir / "blender.stdout.log"
        blender_stderr_path = debug_dir / "blender.stderr.log"
        blender_stdout_path.write_text(completed.stdout, encoding="utf-8")
        blender_stderr_path.write_text(completed.stderr, encoding="utf-8")

        if completed.returncode != 0:
            stdout_tail = completed.stdout[-1200:]
            stderr_tail = completed.stderr[-1200:]
            command_str = " ".join(shlex.quote(part) for part in command)
            hint = ""
            if "libEGL.so.1" in completed.stderr or "libEGL.so.1" in completed.stdout:
                hint = (
                    " Hint: libEGL.so.1 missing. Ensure Docker image installs libegl1 (and related GL/EGL headless dependencies)."
                )
            raise RuntimeError(
                "Blender headless step failed. "
                f"exitCode={completed.returncode} command={command_str} "
                f"stdout_tail={stdout_tail!r} stderr_tail={stderr_tail!r}.{hint}"
            )

        stdout = completed.stdout.strip().splitlines()
        if not stdout:
            return {"warning": "blender_stdout_empty"}
        try:
            return json.loads(stdout[-1])
        except json.JSONDecodeError:
            return {"stdout_tail": stdout[-1]}
