from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


def log(message: str) -> None:
    print(f"[uv_unwrap] {message}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Headless UV unwrap for GLB/GLTF.")
    parser.add_argument("--input", required=True, help="Path to input .glb/.gltf")
    parser.add_argument("--output", required=True, help="Path to output .glb")
    return parser.parse_args(argv)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.textures):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def import_model(input_path: Path) -> None:
    suffix = input_path.suffix.lower()
    if suffix not in {".glb", ".gltf"}:
        raise RuntimeError(f"Unsupported input format: {suffix}. Expected .glb or .gltf")
    log(f"Importing model: {input_path}")
    bpy.ops.import_scene.gltf(filepath=str(input_path))


def pick_target_mesh() -> bpy.types.Object:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("No mesh objects found after import.")
    target = max(meshes, key=lambda obj: len(obj.data.polygons))
    log(f"Selected mesh: {target.name}")
    return target


def apply_uv_unwrap(target: bpy.types.Object) -> None:
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")


def export_model(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    log(f"Exporting model: {output_path}")
    bpy.ops.export_scene.gltf(filepath=str(output_path), export_format="GLB")


def main() -> None:
    args_start = sys.argv.index("--") + 1 if "--" in sys.argv else len(sys.argv)
    args = parse_args(sys.argv[args_start:])

    input_path = Path(args.input).resolve()
    output_path = Path(args.output).resolve()

    if not input_path.exists():
        raise RuntimeError(f"Input file not found: {input_path}")

    log("Resetting scene")
    clear_scene()
    import_model(input_path)

    target = pick_target_mesh()
    log("Applying Smart UV Project")
    apply_uv_unwrap(target)

    export_model(output_path)
    log("UV processing completed")


if __name__ == "__main__":
    main()
