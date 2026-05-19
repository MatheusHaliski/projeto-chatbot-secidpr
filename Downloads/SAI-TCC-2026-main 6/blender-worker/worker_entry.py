from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import bpy


def ensure_object(name: str):
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Required object not found: {name}")
    return obj


def auto_uv_unwrap(target_obj, hq: bool):
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.objects.active = target_obj
    target_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=66.0 if not hq else 72.0, island_margin=0.02 if not hq else 0.04)
    bpy.ops.object.mode_set(mode='OBJECT')


def apply_color_material(target_obj, color_hex: str):
    color_hex = color_hex.lstrip('#')
    if len(color_hex) != 6:
        color_hex = 'C1121F'

    rgb = tuple(int(color_hex[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    mat = bpy.data.materials.get('ShirtMaterial') or bpy.data.materials.new(name='ShirtMaterial')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)

    if len(target_obj.data.materials) == 0:
        target_obj.data.materials.append(mat)
    else:
        target_obj.data.materials[0] = mat


def export_uv_layout(target_obj, output_dir: Path, wardrobe_item_id: str):
    uv_path = output_dir / f"{wardrobe_item_id}_uv_layout.png"
    bpy.context.view_layer.objects.active = target_obj
    target_obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.uv.export_layout(filepath=str(uv_path), size=(1024, 1024), opacity=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    return uv_path


def render_preview(output_dir: Path, wardrobe_item_id: str):
    preview_path = output_dir / f"{wardrobe_item_id}_preview_front.png"
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.filepath = str(preview_path)
    bpy.ops.render.render(write_still=True)
    return preview_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--job-json', required=True)
    parser.add_argument('--output-dir', required=True)
    args, _ = parser.parse_known_args()

    payload = json.loads(Path(args.job_json).read_text(encoding='utf-8'))
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    wardrobe_item_id = payload['wardrobe_item_id']
    hq = payload.get('generation_mode') == 'hq_uv'

    started = time.time()
    target_obj = ensure_object('GARMENT_LAYER')

    t0 = time.time()
    auto_uv_unwrap(target_obj, hq=hq)
    unwrap_ms = int((time.time() - t0) * 1000)

    t1 = time.time()
    apply_color_material(target_obj, payload.get('color', '#C1121F'))
    material_ms = int((time.time() - t1) * 1000)

    t2 = time.time()
    uv_layout = export_uv_layout(target_obj, output_dir, wardrobe_item_id)
    preview = render_preview(output_dir, wardrobe_item_id)
    export_ms = int((time.time() - t2) * 1000)

    result = {
        'artifacts': {
            'uvLayout': str(uv_layout),
            'previewFront': str(preview),
        },
        'metrics': {
            'unwrapMs': unwrap_ms,
            'materialMs': material_ms,
            'exportMs': export_ms,
            'totalMs': int((time.time() - started) * 1000),
        },
    }
    result_path = output_dir / f"{wardrobe_item_id}_result.json"
    result_path.write_text(json.dumps(result, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
