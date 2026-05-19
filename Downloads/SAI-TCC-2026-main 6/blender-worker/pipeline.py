from __future__ import annotations

import json
import logging
import math
import os
import subprocess
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import requests
from PIL import Image
from rembg import remove

logger = logging.getLogger("stylistai.pipeline")
VALIDATION_MODE_STRICT = "strict"
VALIDATION_MODE_PRODUCTION = "production"
DEFAULT_VALIDATION_MODE = VALIDATION_MODE_PRODUCTION
DEFAULT_MIN_INPUT_SHORTEST_SIDE = 256
STRICT_MIN_INPUT_SHORTEST_SIDE = 448
DEFAULT_BLUR_THRESHOLD = 40.0
STRICT_BLUR_THRESHOLD = 85.0
DEFAULT_BLUR_THRESHOLD_LOW_TEXTURE = 24.0
STRICT_BLUR_THRESHOLD_LOW_TEXTURE = 45.0
DEFAULT_LOW_TEXTURE_STD_THRESHOLD = 32.0
DEFAULT_EDGE_DENSITY_MIN = 0.0018
STRICT_EDGE_DENSITY_MIN = 0.006
DEFAULT_EDGE_DENSITY_LOW_TEXTURE = 0.0009
STRICT_EDGE_DENSITY_LOW_TEXTURE = 0.0025
DEFAULT_ALLOW_PREPROCESS_RETRY = True
DEFAULT_PREPROCESS_SHARPEN_AMOUNT = 0.25
DEFAULT_PREPROCESS_UPSCALE_MIN_SIDE = 1024
DEFAULT_PREPROCESS_CONTRAST = 1.06
DEFAULT_CLEANED_QUALITY_THRESHOLD = 0.35
STRICT_CLEANED_QUALITY_THRESHOLD = 0.62
HARD_MIN_INPUT_SHORTEST_SIDE = 64
_CONFIG_LOGGED = False


@dataclass
class PipelineError(Exception):
    code: str
    message: str
    details: dict[str, Any] | None = None


@dataclass
class ImageValidationResult:
    accepted: bool
    code: str | None
    message: str | None
    metadata: dict[str, Any]


def _variance_of_laplacian(img_bgr: np.ndarray) -> float:
    return float(cv2.Laplacian(img_bgr, cv2.CV_64F).var())


def _background_complexity(gray: np.ndarray) -> float:
    edges = cv2.Canny(gray, 80, 160)
    return float(np.count_nonzero(edges) / edges.size)


def _brightness(gray: np.ndarray) -> float:
    return float(np.mean(gray) / 255.0)


def _contrast(gray: np.ndarray) -> float:
    return float(np.std(gray) / 255.0)


def _skin_ratio(rgb: np.ndarray) -> float:
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    lower = np.array([0, 35, 40], dtype=np.uint8)
    upper = np.array([25, 210, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower, upper)
    return float(np.count_nonzero(mask) / mask.size)


def _face_confidence(gray: np.ndarray) -> float:
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(24, 24))
    if len(faces) == 0:
        return 0.0
    area = gray.shape[0] * gray.shape[1]
    max_ratio = max((w * h) / area for (_, _, w, h) in faces)
    return float(min(1.0, 0.3 + max_ratio * 8.0))


def _connected_components(mask: np.ndarray) -> tuple[int, np.ndarray, np.ndarray]:
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    if num_labels <= 1:
        return 0, labels, np.zeros((0, 5), dtype=np.int32)
    return num_labels - 1, labels, stats[1:]


def _get_env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        logger.warning("Invalid %s value '%s'; using default %.4f", name, raw, default)
        return default


def _get_env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning("Invalid %s value '%s'; using default %d", name, raw, default)
        return default


def _get_env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _get_validation_mode() -> str:
    raw = os.getenv("VALIDATION_MODE", DEFAULT_VALIDATION_MODE).strip().lower()
    if raw in {VALIDATION_MODE_STRICT, VALIDATION_MODE_PRODUCTION}:
        return raw
    if raw:
        logger.warning("Invalid VALIDATION_MODE value '%s'; using default '%s'", raw, DEFAULT_VALIDATION_MODE)
    return DEFAULT_VALIDATION_MODE


def _validation_defaults(validation_mode: str) -> dict[str, float | int | bool]:
    strict_mode = validation_mode == VALIDATION_MODE_STRICT
    return {
        "min_shortest_side": STRICT_MIN_INPUT_SHORTEST_SIDE if strict_mode else DEFAULT_MIN_INPUT_SHORTEST_SIDE,
        "blur_threshold_default": STRICT_BLUR_THRESHOLD if strict_mode else DEFAULT_BLUR_THRESHOLD,
        "blur_threshold_low_texture": STRICT_BLUR_THRESHOLD_LOW_TEXTURE if strict_mode else DEFAULT_BLUR_THRESHOLD_LOW_TEXTURE,
        "edge_density_min": STRICT_EDGE_DENSITY_MIN if strict_mode else DEFAULT_EDGE_DENSITY_MIN,
        "edge_density_low_texture": STRICT_EDGE_DENSITY_LOW_TEXTURE if strict_mode else DEFAULT_EDGE_DENSITY_LOW_TEXTURE,
        "cleaned_quality_threshold": STRICT_CLEANED_QUALITY_THRESHOLD if strict_mode else DEFAULT_CLEANED_QUALITY_THRESHOLD,
    }


def _read_validation_config(validation_mode: str) -> dict[str, Any]:
    defaults = _validation_defaults(validation_mode)
    cfg = {
        "validation_mode": validation_mode,
        "min_shortest_side": max(1, _get_env_int("MIN_INPUT_SHORTEST_SIDE", int(defaults["min_shortest_side"]))),
        "blur_threshold_default": max(
            0.0,
            _get_env_float("BLUR_THRESHOLD", _get_env_float("GARMENT_BLUR_THRESHOLD_DEFAULT", float(defaults["blur_threshold_default"]))),
        ),
        "blur_threshold_low_texture": max(
            0.0,
            _get_env_float(
                "BLUR_THRESHOLD_LOW_TEXTURE",
                _get_env_float("GARMENT_BLUR_THRESHOLD_LOW_TEXTURE", float(defaults["blur_threshold_low_texture"])),
            ),
        ),
        "edge_density_min": max(
            0.0,
            _get_env_float("EDGE_DENSITY_MIN", _get_env_float("GARMENT_EDGE_DENSITY_MIN", float(defaults["edge_density_min"]))),
        ),
        "edge_density_low_texture": max(
            0.0,
            _get_env_float(
                "EDGE_DENSITY_LOW_TEXTURE",
                _get_env_float("GARMENT_EDGE_DENSITY_LOW_TEXTURE", float(defaults["edge_density_low_texture"])),
            ),
        ),
        "quality_score_min": max(
            0.0,
            min(
                1.0,
                _get_env_float(
                    "QUALITY_SCORE_MIN",
                    _get_env_float("CLEANED_QUALITY_THRESHOLD", float(defaults["cleaned_quality_threshold"])),
                ),
            ),
        ),
        "low_texture_std_threshold": max(0.0, _get_env_float("GARMENT_LOW_TEXTURE_STD_THRESHOLD", DEFAULT_LOW_TEXTURE_STD_THRESHOLD)),
        "enable_person_detection": _get_env_bool("ENABLE_PERSON_DETECTION", False),
        "allow_preprocess_retry": _get_env_bool("GARMENT_ALLOW_PREPROCESS_RETRY", DEFAULT_ALLOW_PREPROCESS_RETRY),
        "preprocess_sharpen_amount": max(0.0, _get_env_float("GARMENT_PREPROCESS_SHARPEN_AMOUNT", DEFAULT_PREPROCESS_SHARPEN_AMOUNT)),
        "preprocess_contrast": max(0.1, _get_env_float("GARMENT_PREPROCESS_CONTRAST", DEFAULT_PREPROCESS_CONTRAST)),
    }
    global _CONFIG_LOGGED
    if not _CONFIG_LOGGED:
        logger.info(
            "[CONFIG] %s",
            {
                "validation_mode": cfg["validation_mode"],
                "min_size": cfg["min_shortest_side"],
                "blur": cfg["blur_threshold_default"],
                "blur_low_texture": cfg["blur_threshold_low_texture"],
                "edge": cfg["edge_density_min"],
                "edge_low_texture": cfg["edge_density_low_texture"],
                "quality": cfg["quality_score_min"],
                "enable_person_detection": cfg["enable_person_detection"],
            },
        )
        _CONFIG_LOGGED = True
    return cfg


def fetch_image(image_url: str, out_path: Path) -> Path:
    response = requests.get(image_url, timeout=30)
    response.raise_for_status()
    out_path.write_bytes(response.content)
    return out_path


def _compute_quality_metrics(bgr: np.ndarray) -> dict[str, float]:
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    return {
        "blurScore": _variance_of_laplacian(bgr),
        "textureScore": float(np.std(gray)),
        "edgeDensity": _background_complexity(gray),
        "brightness": _brightness(gray),
        "contrast": _contrast(gray),
        "backgroundComplexity": _background_complexity(gray),
        "personFaceConfidence": _face_confidence(gray),
        "skinRatio": _skin_ratio(rgb),
    }


def _preprocess_for_blur_retry(
    bgr: np.ndarray,
    upscale_min_side: int,
    sharpen_amount: float,
    contrast_gain: float,
) -> np.ndarray:
    h, w = bgr.shape[:2]
    min_side = min(h, w)
    processed = bgr
    if min_side < upscale_min_side:
        scale = upscale_min_side / float(min_side)
        new_w = max(1, int(round(w * scale)))
        new_h = max(1, int(round(h * scale)))
        processed = cv2.resize(processed, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    blurred = cv2.GaussianBlur(processed, (0, 0), 1.2)
    processed = cv2.addWeighted(processed, 1.0 + sharpen_amount, blurred, -sharpen_amount, 0)
    processed = cv2.convertScaleAbs(processed, alpha=contrast_gain, beta=0)
    return processed


def _log_input_quality_decision(
    *,
    decision: str,
    validation_mode: str,
    metadata: dict[str, Any],
    metrics: dict[str, float],
    blur_threshold: float,
    blur_reject_cutoff: float,
    edge_threshold: float,
    low_texture_class: bool,
    preprocess_retry_applied: bool,
) -> None:
    logger.info(
        "Input quality decision=%s mode=%s width=%d height=%d blurScore=%.4f textureScore=%.4f edgeDensity=%.4f brightness=%.4f contrast=%.4f blurThreshold=%.2f blurRejectCutoff=%.2f edgeThreshold=%.4f lowTextureClass=%s preprocessRetryApplied=%s",
        decision,
        validation_mode,
        metadata["width"],
        metadata["height"],
        metrics["blurScore"],
        metrics["textureScore"],
        metrics["edgeDensity"],
        metrics["brightness"],
        metrics["contrast"],
        blur_threshold,
        blur_reject_cutoff,
        edge_threshold,
        low_texture_class,
        preprocess_retry_applied,
    )


def validate_input_image(image_path: Path) -> ImageValidationResult:
    bgr = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if bgr is None:
        return ImageValidationResult(False, "invalid_input_read_error", "Could not parse image", {})

    validation_mode = _get_validation_mode()
    cfg = _read_validation_config(validation_mode)
    min_shortest_side = int(cfg["min_shortest_side"])
    blur_threshold_default = float(cfg["blur_threshold_default"])
    blur_threshold_low_texture = float(cfg["blur_threshold_low_texture"])
    low_texture_std_threshold = float(cfg["low_texture_std_threshold"])
    edge_density_min = float(cfg["edge_density_min"])
    edge_density_low_texture = float(cfg["edge_density_low_texture"])
    allow_preprocess_retry = bool(cfg["allow_preprocess_retry"])
    preprocess_sharpen_amount = float(cfg["preprocess_sharpen_amount"])
    preprocess_contrast = float(cfg["preprocess_contrast"])
    enable_person_detection = bool(cfg["enable_person_detection"])

    h, w = bgr.shape[:2]
    if min(w, h) < HARD_MIN_INPUT_SHORTEST_SIDE:
        return ImageValidationResult(
            False,
            "invalid_input_low_quality",
            f"Image resolution is too low; minimum {HARD_MIN_INPUT_SHORTEST_SIDE}px on shortest side.",
            {"width": w, "height": h, "validationMode": validation_mode},
        )
    if min(w, h) < min_shortest_side:
        scale = min_shortest_side / float(min(w, h))
        new_w = max(1, int(round(w * scale)))
        new_h = max(1, int(round(h * scale)))
        bgr = cv2.resize(bgr, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        h, w = bgr.shape[:2]

    bgr = _preprocess_for_blur_retry(
        bgr=bgr,
        upscale_min_side=min_shortest_side,
        sharpen_amount=preprocess_sharpen_amount,
        contrast_gain=preprocess_contrast,
    )
    h, w = bgr.shape[:2]
    metrics = _compute_quality_metrics(bgr)
    preprocess_retry_applied = False
    low_texture_class = metrics["textureScore"] < low_texture_std_threshold
    applied_blur_threshold = blur_threshold_low_texture if low_texture_class else blur_threshold_default
    applied_edge_density_threshold = edge_density_low_texture if low_texture_class else edge_density_min
    blur_reject_cutoff = applied_blur_threshold * (0.65 if low_texture_class else 0.85)

    metadata = {
        "validationMode": validation_mode,
        "width": w,
        "height": h,
        "blurScore": round(metrics["blurScore"], 4),
        "textureScore": round(metrics["textureScore"], 4),
        "edgeDensity": round(metrics["edgeDensity"], 4),
        "appliedBlurThreshold": round(applied_blur_threshold, 4),
        "appliedEdgeDensityThreshold": round(applied_edge_density_threshold, 4),
        "lowTextureClass": bool(low_texture_class),
        "preprocessRetryApplied": bool(preprocess_retry_applied),
        "brightness": round(metrics["brightness"], 4),
        "contrast": round(metrics["contrast"], 4),
        "backgroundComplexity": round(metrics["backgroundComplexity"], 4),
        "personFaceConfidence": round(metrics["personFaceConfidence"], 4),
        "skinRatio": round(metrics["skinRatio"], 4),
        "edgeDensityMin": round(edge_density_min, 4),
        "edgeDensityLowTextureMin": round(edge_density_low_texture, 4),
        "blurRejectCutoff": round(blur_reject_cutoff, 4),
        "thresholds": {
            "minShortestSide": min_shortest_side,
            "blurDefault": round(blur_threshold_default, 4),
            "blurLowTexture": round(blur_threshold_low_texture, 4),
            "edgeDensityMin": round(edge_density_min, 6),
            "edgeDensityLowTextureMin": round(edge_density_low_texture, 6),
        },
    }

    quality_decision = "accepted"

    if metrics["blurScore"] < blur_reject_cutoff:
        should_retry = allow_preprocess_retry and not preprocess_retry_applied
        if should_retry:
            retry_bgr = _preprocess_for_blur_retry(
                bgr=bgr,
                upscale_min_side=min_shortest_side,
                sharpen_amount=preprocess_sharpen_amount,
                contrast_gain=preprocess_contrast,
            )
            metrics = _compute_quality_metrics(retry_bgr)
            preprocess_retry_applied = True
            low_texture_class = metrics["textureScore"] < low_texture_std_threshold
            applied_blur_threshold = blur_threshold_low_texture if low_texture_class else blur_threshold_default
            applied_edge_density_threshold = edge_density_low_texture if low_texture_class else edge_density_min
            blur_reject_cutoff = applied_blur_threshold * (0.65 if low_texture_class else 0.85)
            metadata.update({
                "blurScore": round(metrics["blurScore"], 4),
                "textureScore": round(metrics["textureScore"], 4),
                "edgeDensity": round(metrics["edgeDensity"], 4),
                "appliedBlurThreshold": round(applied_blur_threshold, 4),
                "appliedEdgeDensityThreshold": round(applied_edge_density_threshold, 4),
                "blurRejectCutoff": round(blur_reject_cutoff, 4),
                "lowTextureClass": bool(low_texture_class),
                "preprocessRetryApplied": bool(preprocess_retry_applied),
                "brightness": round(metrics["brightness"], 4),
                "contrast": round(metrics["contrast"], 4),
                "backgroundComplexity": round(metrics["backgroundComplexity"], 4),
                "personFaceConfidence": round(metrics["personFaceConfidence"], 4),
                "skinRatio": round(metrics["skinRatio"], 4),
            })

    validation_warnings: list[str] = []

    if metrics["blurScore"] < blur_reject_cutoff:
        quality_decision = "rejected_blur"
        _log_input_quality_decision(
            decision=quality_decision,
            validation_mode=validation_mode,
            metadata=metadata,
            metrics=metrics,
            blur_threshold=applied_blur_threshold,
            blur_reject_cutoff=blur_reject_cutoff,
            edge_threshold=applied_edge_density_threshold,
            low_texture_class=low_texture_class,
            preprocess_retry_applied=preprocess_retry_applied,
        )
        if validation_mode == VALIDATION_MODE_PRODUCTION:
            validation_warnings.append("blur_below_threshold")
        else:
            return ImageValidationResult(False, "invalid_input_low_quality", "Image is too blurry for garment reconstruction.", metadata)
    if metrics["brightness"] < 0.12 or metrics["brightness"] > 0.96:
        quality_decision = "rejected_brightness"
        _log_input_quality_decision(
            decision=quality_decision,
            validation_mode=validation_mode,
            metadata=metadata,
            metrics=metrics,
            blur_threshold=applied_blur_threshold,
            blur_reject_cutoff=blur_reject_cutoff,
            edge_threshold=applied_edge_density_threshold,
            low_texture_class=low_texture_class,
            preprocess_retry_applied=preprocess_retry_applied,
        )
        if validation_mode == VALIDATION_MODE_PRODUCTION:
            validation_warnings.append("brightness_out_of_range")
        else:
            return ImageValidationResult(False, "invalid_input_low_quality", "Image lighting is unsuitable (under/over exposed).", metadata)
    if metrics["contrast"] < 0.06:
        quality_decision = "rejected_contrast"
        _log_input_quality_decision(
            decision=quality_decision,
            validation_mode=validation_mode,
            metadata=metadata,
            metrics=metrics,
            blur_threshold=applied_blur_threshold,
            blur_reject_cutoff=blur_reject_cutoff,
            edge_threshold=applied_edge_density_threshold,
            low_texture_class=low_texture_class,
            preprocess_retry_applied=preprocess_retry_applied,
        )
        if validation_mode == VALIDATION_MODE_PRODUCTION:
            validation_warnings.append("contrast_too_low")
        else:
            return ImageValidationResult(False, "invalid_input_low_quality", "Image contrast is too low.", metadata)
    if metrics["backgroundComplexity"] > 0.28:
        quality_decision = "rejected_background"
        _log_input_quality_decision(
            decision=quality_decision,
            validation_mode=validation_mode,
            metadata=metadata,
            metrics=metrics,
            blur_threshold=applied_blur_threshold,
            blur_reject_cutoff=blur_reject_cutoff,
            edge_threshold=applied_edge_density_threshold,
            low_texture_class=low_texture_class,
            preprocess_retry_applied=preprocess_retry_applied,
        )
        if validation_mode == VALIDATION_MODE_PRODUCTION:
            validation_warnings.append("background_too_noisy")
        else:
            return ImageValidationResult(False, "invalid_input_background_noise", "Background is too noisy for reliable product isolation.", metadata)
    if enable_person_detection and (metrics["personFaceConfidence"] > 0.45 or metrics["skinRatio"] > 0.22):
        quality_decision = "rejected_person"
        _log_input_quality_decision(
            decision=quality_decision,
            validation_mode=validation_mode,
            metadata=metadata,
            metrics=metrics,
            blur_threshold=applied_blur_threshold,
            blur_reject_cutoff=blur_reject_cutoff,
            edge_threshold=applied_edge_density_threshold,
            low_texture_class=low_texture_class,
            preprocess_retry_applied=preprocess_retry_applied,
        )
        if validation_mode == VALIDATION_MODE_PRODUCTION:
            logger.warning("Person-like features detected but tolerated in production mode")
            validation_warnings.append("person_like_features_detected")
        else:
            return ImageValidationResult(False, "invalid_input_person_detected", "Visible person/body features detected in input image.", metadata)

    _log_input_quality_decision(
        decision=quality_decision,
        validation_mode=validation_mode,
        metadata=metadata,
        metrics=metrics,
        blur_threshold=applied_blur_threshold,
        blur_reject_cutoff=blur_reject_cutoff,
        edge_threshold=applied_edge_density_threshold,
        low_texture_class=low_texture_class,
        preprocess_retry_applied=preprocess_retry_applied,
    )

    if validation_warnings and validation_mode == VALIDATION_MODE_PRODUCTION:
        logger.warning("Validation soft-failed in production mode; continuing pipeline warnings=%s", validation_warnings)
    metadata["validationWarnings"] = validation_warnings
    metadata["personDetectionEnabled"] = enable_person_detection
    return ImageValidationResult(True, None, None, metadata)


def preprocess_garment(image_path: Path, cleaned_path: Path) -> dict[str, Any]:
    src = Image.open(image_path).convert("RGBA")
    removed = remove(src)
    rgba = np.array(removed)
    alpha = rgba[:, :, 3]

    mask = (alpha > 30).astype(np.uint8)
    component_count, labels, stats = _connected_components(mask)
    if component_count == 0:
        raise PipelineError("segmentation_failed", "Could not isolate garment from image background.")

    areas = stats[:, cv2.CC_STAT_AREA]
    best_idx = int(np.argmax(areas))
    best_area = int(areas[best_idx])

    image_area = mask.shape[0] * mask.shape[1]
    occupancy = best_area / image_area
    if occupancy < 0.12:
        raise PipelineError("invalid_input_low_quality", "Garment occupies too little of the frame after segmentation.", {"occupancy": occupancy})

    competing = [int(a) for a in areas if a > best_area * 0.35]
    if len(competing) > 1:
        raise PipelineError("invalid_input_multiple_objects", "Multiple competing foreground objects detected.", {"foregroundComponents": len(competing)})

    component_mask = (labels == (best_idx + 1)).astype(np.uint8)
    ys, xs = np.where(component_mask > 0)
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())

    bbox_w = x1 - x0 + 1
    bbox_h = y1 - y0 + 1
    margin = max(12, int(max(bbox_w, bbox_h) * 0.08))

    x0 = max(0, x0 - margin)
    y0 = max(0, y0 - margin)
    x1 = min(rgba.shape[1] - 1, x1 + margin)
    y1 = min(rgba.shape[0] - 1, y1 + margin)

    cropped = rgba[y0 : y1 + 1, x0 : x1 + 1]
    ch, cw = cropped.shape[:2]
    side = max(ch, cw, 1024)
    canvas = np.zeros((side, side, 4), dtype=np.uint8)
    oy = (side - ch) // 2
    ox = (side - cw) // 2
    canvas[oy : oy + ch, ox : ox + cw] = cropped

    cleaned = Image.fromarray(canvas, mode="RGBA")
    cleaned.save(cleaned_path)

    alpha_clean = canvas[:, :, 3] > 30
    cont_ratio = 1.0 - (np.count_nonzero(alpha_clean) / alpha_clean.size)

    return {
        "bbox": {"x": x0, "y": y0, "width": bbox_w, "height": bbox_h},
        "componentCount": int(component_count),
        "occupancyRatio": round(float(occupancy), 4),
        "backgroundContamination": round(float(cont_ratio), 4),
        "cleanWidth": int(side),
        "cleanHeight": int(side),
    }


def score_cleaned_image(cleaned_path: Path) -> dict[str, Any]:
    validation_mode = _get_validation_mode()
    cfg = _read_validation_config(validation_mode)
    cleaned_quality_threshold = float(cfg["quality_score_min"])

    rgba = cv2.imread(str(cleaned_path), cv2.IMREAD_UNCHANGED)
    if rgba is None:
        raise PipelineError("segmentation_failed", "Failed to read cleaned garment image")

    if rgba.shape[2] == 4:
        alpha = rgba[:, :, 3]
        rgb = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_BGR2RGB)
    else:
        alpha = np.full(rgba.shape[:2], 255, dtype=np.uint8)
        rgb = cv2.cvtColor(rgba, cv2.COLOR_BGR2RGB)

    garment = alpha > 30
    if not np.any(garment):
        raise PipelineError("segmentation_failed", "No foreground garment pixels present after cleanup")

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    blur = _variance_of_laplacian(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    brightness = _brightness(gray)
    contrast = _contrast(gray)

    ys, xs = np.where(garment)
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    w = rgb.shape[1]
    h = rgb.shape[0]

    occ = float(np.count_nonzero(garment) / garment.size)
    margins = [x0 / w, (w - x1 - 1) / w, y0 / h, (h - y1 - 1) / h]
    margin_balance = float(1.0 - np.std(margins))

    left = garment[:, : w // 2]
    right = np.fliplr(garment[:, w - w // 2 :])
    min_w = min(left.shape[1], right.shape[1])
    symmetry = float(np.mean(left[:, :min_w] == right[:, :min_w]))

    touching_edge = any([
        np.mean(garment[0, :]) > 0.02,
        np.mean(garment[-1, :]) > 0.02,
        np.mean(garment[:, 0]) > 0.02,
        np.mean(garment[:, -1]) > 0.02,
    ])
    edge_completeness = 0.0 if touching_edge else 1.0

    report = {
        "blur": round(float(blur), 4),
        "brightness": round(float(brightness), 4),
        "contrast": round(float(contrast), 4),
        "garmentOccupancy": round(float(occ), 4),
        "marginBalance": round(float(max(0.0, min(1.0, margin_balance))), 4),
        "symmetry": round(float(symmetry), 4),
        "edgeCompleteness": round(float(edge_completeness), 4),
        "backgroundContamination": round(float(1.0 - occ), 4),
        "personContaminationConfidence": 0.0,
    }

    weighted = (
        min(1.0, blur / 250.0) * 0.2
        + max(0.0, 1.0 - abs(brightness - 0.55) / 0.55) * 0.15
        + min(1.0, contrast / 0.35) * 0.15
        + max(0.0, 1.0 - abs(occ - 0.4) / 0.4) * 0.2
        + report["marginBalance"] * 0.1
        + report["edgeCompleteness"] * 0.1
        + report["symmetry"] * 0.1
    )
    report["qualityScore"] = round(float(weighted), 4)
    report["qualityThreshold"] = round(float(cleaned_quality_threshold), 4)
    report["validationMode"] = validation_mode

    if report["qualityScore"] < cleaned_quality_threshold:
        if validation_mode == VALIDATION_MODE_PRODUCTION:
            logger.warning(
                "Cleaned image quality below threshold but tolerated in production mode score=%.4f threshold=%.4f",
                report["qualityScore"],
                cleaned_quality_threshold,
            )
            report["validationWarning"] = "cleaned_quality_below_threshold"
            return report
        raise PipelineError(
            "invalid_input_low_quality",
            "Cleaned garment image did not meet quality threshold.",
            {"qualityReport": report},
        )

    return report


def build_meshy_prompt(clean_meta: dict[str, Any], options: dict[str, Any]) -> str:
    garment = str(options.get("garmentType") or options.get("category") or "garment")
    color = str(options.get("color") or "neutral")
    material = str(options.get("material") or "fabric")
    sleeve = str(options.get("sleeveStyle") or "")
    silhouette = str(options.get("silhouette") or "")
    parts = [
        "isolated",
        color,
        sleeve,
        silhouette,
        garment,
        material,
        "product shot",
        "centered",
        "plain transparent background",
    ]
    text = " ".join([p for p in parts if p]).replace("  ", " ").strip()
    return text


def generate_base_glb_with_meshy(cleaned_image_path: Path, output_glb: Path, prompt: str, options: dict[str, Any]) -> dict[str, Any]:
    # Placeholder for real Meshy integration; preserves contract and debug metadata.
    # If MESHY_API_KEY/API endpoint are configured, call provider endpoint.
    api_key = os.getenv("MESHY_API_KEY", "").strip()
    api_url = os.getenv("MESHY_API_URL", "").strip()

    if api_key and api_url:
        # Kept minimal and provider-agnostic.
        with cleaned_image_path.open("rb") as f:
            files = {"image": f}
            data = {"prompt": prompt}
            headers = {"Authorization": f"Bearer {api_key}"}
            resp = requests.post(api_url, headers=headers, data=data, files=files, timeout=120)
            if resp.status_code >= 400:
                raise PipelineError("meshy_failed", f"Meshy request failed: {resp.status_code}", {"body": resp.text[:400]})

            # Expected response may include file URL; this is intentionally defensive.
            payload = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
            model_url = payload.get("model_url") or payload.get("glb_url")
            if model_url:
                model_resp = requests.get(model_url, timeout=120)
                model_resp.raise_for_status()
                output_glb.write_bytes(model_resp.content)
            else:
                output_glb.write_bytes(resp.content)

        return {"provider": "meshy", "prompt": prompt, "usedCleanedImage": str(cleaned_image_path)}

    # Fallback deterministic minimal GLB for local/dev.
    gltf_json = {
        "asset": {"version": "2.0", "generator": "StylistAI-MeshyFallback"},
        "scene": 0,
        "scenes": [{"nodes": []}],
        "nodes": [],
        "extras": {
            "prompt": prompt,
            "source": str(cleaned_image_path),
            "note": "Fallback mode: no Meshy credentials configured",
        },
    }
    json_bytes = json.dumps(gltf_json, separators=(",", ":")).encode("utf-8")
    padded_json = json_bytes + (b" " * ((4 - len(json_bytes) % 4) % 4))
    total_length = 12 + 8 + len(padded_json)
    import struct

    with output_glb.open("wb") as glb:
        glb.write(struct.pack("<III", 0x46546C67, 2, total_length))
        glb.write(struct.pack("<I4s", len(padded_json), b"JSON"))
        glb.write(padded_json)

    return {"provider": "fallback", "prompt": prompt, "usedCleanedImage": str(cleaned_image_path)}


def run_blender_refinement(base_glb: Path, refined_glb: Path, debug_dir: Path) -> dict[str, Any]:
    blender_bin = os.getenv("BLENDER_BIN", "").strip()
    script_path = Path(__file__).parent / "blender-scripts" / "refine_glb.py"

    if blender_bin:
        cmd = [
            blender_bin,
            "-b",
            "--python",
            str(script_path),
            "--",
            "--input-glb",
            str(base_glb),
            "--output-glb",
            str(refined_glb),
        ]
        completed = subprocess.run(cmd, capture_output=True, text=True)
        if completed.returncode != 0:
            raise PipelineError("blender_failed", "Blender refinement failed", {"stderr": completed.stderr[-1200:]})
        return {"method": "blender", "script": str(script_path)}

    # Fallback refinement via trimesh when Blender is not configured.
    try:
        import trimesh
    except Exception as exc:
        raise PipelineError("blender_failed", "Neither Blender nor trimesh refinement is available", {"error": str(exc)})

    scene = trimesh.load(str(base_glb), force="scene")
    meshes = []
    for geom in scene.geometry.values():
        if hasattr(geom, "vertices") and len(geom.vertices) > 0:
            meshes.append(geom.copy())
    if not meshes:
        refined_glb.write_bytes(base_glb.read_bytes())
        return {"method": "passthrough", "reason": "no mesh geometry"}

    combined = trimesh.util.concatenate(meshes)
    combined.remove_unreferenced_vertices()
    combined.remove_degenerate_faces()
    combined.fix_normals()

    bounds = combined.bounds
    center = (bounds[0] + bounds[1]) / 2.0
    combined.apply_translation(-center)
    extent = np.max(bounds[1] - bounds[0])
    scale = 1.0 / extent if extent > 0 else 1.0
    combined.apply_scale(scale)

    refined_scene = trimesh.Scene(combined)
    refined_scene.export(str(refined_glb))
    return {"method": "trimesh", "normalizedScale": float(scale)}
