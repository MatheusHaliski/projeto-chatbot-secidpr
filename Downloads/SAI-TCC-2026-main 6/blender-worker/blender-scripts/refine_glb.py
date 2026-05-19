from __future__ import annotations

import argparse

import bpy
from mathutils import Vector

# ── Garment isolation ─────────────────────────────────────────────────────────
# Mirrors the logic in blender_pipeline.py so the refinement step also strips
# human bodies and stray objects before normalising the geometry.

_HUMAN_NAME_TOKENS: frozenset[str] = frozenset({
    "body", "human", "person", "mannequin", "avatar", "figure",
    "skin", "flesh", "character", "armature", "skeleton", "torso_body",
    "head", "hand", "foot", "leg", "arm",
})
_HUMAN_ASPECT_RATIO = 3.5
_MIN_POLY_FRACTION = 0.05


def _is_human_like(obj) -> bool:
    name_lower = (obj.name + " " + obj.data.name).lower()
    for token in _HUMAN_NAME_TOKENS:
        if token in name_lower:
            print(f"[refine] human_name_match: '{obj.name}' matched token='{token}'")
            return True
    bbox = [obj.matrix_world @ v for v in obj.bound_box]
    xs = [v.x for v in bbox]
    ys = [v.y for v in bbox]
    zs = [v.z for v in bbox]
    width_xy = max(max(xs) - min(xs), max(ys) - min(ys), 1e-6)
    height_z = max(zs) - min(zs)
    aspect = height_z / width_xy
    if aspect >= _HUMAN_ASPECT_RATIO:
        print(f"[refine] human_aspect_match: '{obj.name}' aspect={aspect:.2f}")
        return True
    return False


def _filter_garment_only(mesh_objects: list) -> list:
    """Return only the mesh(es) that are likely garments, removing humans and props."""
    if not mesh_objects:
        return mesh_objects

    # Stage 1 — drop human-like meshes
    candidates = [o for o in mesh_objects if not _is_human_like(o)]
    if not candidates:
        print("[refine] CRITICAL: all meshes look human; keeping largest as fallback")
        candidates = mesh_objects

    # Stage 2 — drop tiny props (< _MIN_POLY_FRACTION of largest candidate)
    poly_floor = max(len(o.data.polygons) for o in candidates) * _MIN_POLY_FRACTION
    significant = [o for o in candidates if len(o.data.polygons) >= poly_floor]
    result = significant if significant else candidates

    removed = [o for o in mesh_objects if o not in result]
    if removed:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in removed:
            obj.select_set(True)
        bpy.ops.object.delete(use_global=False)
        print(f"[refine] purged {len(removed)} non-garment object(s): {[o.name for o in removed]}")

    return result


def clear_scene() -> None:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def import_glb(path: str) -> None:
    bpy.ops.import_scene.gltf(filepath=path)


def gather_mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']


def remove_non_mesh_objects() -> None:
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)


def merge_meshes(meshes):
    if not meshes:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def center_and_normalize(obj) -> float:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    world_vertices = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    min_corner = Vector((min(v.x for v in world_vertices), min(v.y for v in world_vertices), min(v.z for v in world_vertices)))
    max_corner = Vector((max(v.x for v in world_vertices), max(v.y for v in world_vertices), max(v.z for v in world_vertices)))

    center = (min_corner + max_corner) / 2
    obj.location -= center
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    dims = max_corner - min_corner
    max_dim = max(dims.x, dims.y, dims.z, 1e-6)
    target = 1.0
    factor = target / max_dim
    obj.scale = (factor, factor, factor)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')

    return factor


def export_glb(path: str) -> None:
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        use_selection=False,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-glb', required=True)
    parser.add_argument('--output-glb', required=True)
    args, _ = parser.parse_known_args()

    clear_scene()
    import_glb(args.input_glb)
    remove_non_mesh_objects()
    meshes = gather_mesh_objects()
    # Remove human bodies and stray objects before merging so they never end
    # up baked into the final garment geometry.
    garment_meshes = _filter_garment_only(meshes)
    merged = merge_meshes(garment_meshes)
    if merged:
        center_and_normalize(merged)
    export_glb(args.output_glb)


if __name__ == '__main__':
    main()
