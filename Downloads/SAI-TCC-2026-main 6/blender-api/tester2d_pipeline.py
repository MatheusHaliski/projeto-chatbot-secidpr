from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


class Point(BaseModel):
    x: float
    y: float


class BodyLandmarks(BaseModel):
    neck_center: Point
    left_shoulder_tip: Point
    right_shoulder_tip: Point
    left_armpit: Point
    right_armpit: Point
    waist_center: Point
    left_hip: Point
    right_hip: Point


class GarmentLandmarks(BaseModel):
    collar_center: Point
    left_shoulder_seam: Point
    right_shoulder_seam: Point
    left_sleeve_cuff: Point
    right_sleeve_cuff: Point
    left_hem_corner: Point
    right_hem_corner: Point


class FitMetrics(BaseModel):
    landmark_residual_error: float
    torso_iou_score: float
    distortion_score: float
    quality_score: float
    accepted: bool


class Tester2DRequest(BaseModel):
    mannequin_template_id: str
    mannequin_image: str
    garment_image: str
    category: str = "tshirt"
    run_debug: bool = False


class Tester2DResponse(BaseModel):
    pipeline_version: str
    feature_flag: str
    output_image: str
    fallback_applied: bool
    metrics: FitMetrics
    debug: dict[str, Any] = Field(default_factory=dict)


@dataclass
class StaticMannequinAsset:
    segmentation_mask: str
    occlusion_mask: str
    uv_map: str
    landmarks: BodyLandmarks


class Tester2DPipeline:
    """Pipeline V2 focado em fit-realism para Tester 2D."""

    def __init__(self, assets_dir: str = "blender-api/assets/tester2d") -> None:
        self.assets_dir = Path(assets_dir)
        self.enable_v2 = os.getenv("ENABLE_TESTER_2D_V2", "false").lower() == "true"

    def process(self, payload: Tester2DRequest) -> Tester2DResponse:
        mannequin = self._load_mannequin_assets(payload.mannequin_template_id)
        garment = self._canonicalize_garment(payload.garment_image, payload.category)
        warp_result = self._geometry_aware_warp(mannequin, garment)
        output_image = self._composite_layers(payload.mannequin_image, payload.garment_image, mannequin, warp_result)
        metrics = self._quality_scoring(mannequin, garment, warp_result)

        fallback_applied = False
        if not metrics.accepted:
            warp_result = self._second_pass_or_fallback(mannequin, garment)
            output_image = self._composite_layers(payload.mannequin_image, payload.garment_image, mannequin, warp_result)
            metrics = self._quality_scoring(mannequin, garment, warp_result)
            fallback_applied = True

        debug: dict[str, Any] = {}
        if payload.run_debug:
            debug = {
                "phase0_overlays": {
                    "landmarks": garment.model_dump(),
                    "mannequin_landmarks": mannequin.landmarks.model_dump(),
                    "warp_mesh": warp_result,
                },
                "logs": {
                    "residual": metrics.landmark_residual_error,
                    "iou": metrics.torso_iou_score,
                    "distortion": metrics.distortion_score,
                },
            }

        return Tester2DResponse(
            pipeline_version="tester2d-v2-fit-realism",
            feature_flag="ENABLE_TESTER_2D_V2",
            output_image=output_image,
            fallback_applied=fallback_applied,
            metrics=metrics,
            debug=debug,
        )

    def _load_mannequin_assets(self, template_id: str) -> StaticMannequinAsset:
        metadata_path = self.assets_dir / "mannequins" / template_id / "metadata.json"
        if not metadata_path.exists():
            raise FileNotFoundError(f"Template '{template_id}' não encontrado em {metadata_path}.")

        raw = json.loads(metadata_path.read_text(encoding="utf-8"))
        return StaticMannequinAsset(
            segmentation_mask=raw["segmentation_mask"],
            occlusion_mask=raw["occlusion_mask"],
            uv_map=raw["uv_like_map"],
            landmarks=BodyLandmarks.model_validate(raw["landmarks"]),
        )

    def _canonicalize_garment(self, garment_image: str, category: str) -> GarmentLandmarks:
        # Placeholder determinístico para extração (Phase 1: trocar por extractor service real).
        base = abs(hash(f"{garment_image}:{category}")) % 100
        axis = 0.5
        shoulder_span = 0.2 + (base / 1000)

        return GarmentLandmarks(
            collar_center=Point(x=axis, y=0.12),
            left_shoulder_seam=Point(x=axis - shoulder_span, y=0.19),
            right_shoulder_seam=Point(x=axis + shoulder_span, y=0.19),
            left_sleeve_cuff=Point(x=0.15, y=0.38),
            right_sleeve_cuff=Point(x=0.85, y=0.38),
            left_hem_corner=Point(x=0.24, y=0.85),
            right_hem_corner=Point(x=0.76, y=0.85),
        )

    def _geometry_aware_warp(self, mannequin: StaticMannequinAsset, garment: GarmentLandmarks) -> dict[str, Any]:
        # Modelo abstrato de malha/warp, incluindo constraints de colisão e limite de stretch.
        return {
            "method": "tps",
            "anchors": {
                "neckline_above_chest": True,
                "prevent_sleeve_crossing": True,
                "max_stretch_x": 1.18,
                "max_stretch_y": 1.15,
            },
            "regions": {
                "torso_strength": 0.85,
                "sleeve_strength": 0.62,
            },
            "edge_preserving": True,
            "target_landmarks": mannequin.landmarks.model_dump(),
            "source_landmarks": garment.model_dump(),
        }

    def _composite_layers(
        self,
        mannequin_image: str,
        garment_image: str,
        mannequin: StaticMannequinAsset,
        warp_result: dict[str, Any],
    ) -> str:
        # Composição em camadas: base + garment warpeado + máscara de oclusão.
        # Nesta versão inicial retornamos URL/caminho lógico do output.
        _ = (mannequin_image, garment_image, mannequin, warp_result)
        return "tester2d://output/fit-realism-v2.png"

    def _quality_scoring(
        self,
        mannequin: StaticMannequinAsset,
        garment: GarmentLandmarks,
        warp_result: dict[str, Any],
    ) -> FitMetrics:
        _ = warp_result
        collar_error = abs(garment.collar_center.x - mannequin.landmarks.neck_center.x)
        shoulder_error = (
            abs(garment.left_shoulder_seam.x - mannequin.landmarks.left_shoulder_tip.x)
            + abs(garment.right_shoulder_seam.x - mannequin.landmarks.right_shoulder_tip.x)
        ) / 2
        residual = (collar_error + shoulder_error) / 2

        iou = max(0.0, 1.0 - residual * 1.6)
        distortion = min(1.0, math.sqrt(residual) * 1.2)
        quality = (iou * 0.55) + ((1.0 - distortion) * 0.45)
        accepted = residual < 0.08 and iou > 0.72 and distortion < 0.45

        return FitMetrics(
            landmark_residual_error=round(residual, 4),
            torso_iou_score=round(iou, 4),
            distortion_score=round(distortion, 4),
            quality_score=round(quality, 4),
            accepted=accepted,
        )

    def _second_pass_or_fallback(self, mannequin: StaticMannequinAsset, garment: GarmentLandmarks) -> dict[str, Any]:
        return {
            "method": "piecewise_affine",
            "mode": "conservative_centered_fit",
            "anchors": mannequin.landmarks.model_dump(),
            "source_landmarks": garment.model_dump(),
        }
