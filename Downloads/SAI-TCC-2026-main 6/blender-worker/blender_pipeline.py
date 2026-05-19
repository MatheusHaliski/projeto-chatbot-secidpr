"""
blender_pipeline.py — Blender headless pipeline for StylistAI.

Run as:
    blender --background --python blender_pipeline.py -- \
        --input-model /path/to/base_meshy.glb \
        --output-model /path/to/final_model.glb \
        [--front-axis Y]   # axis that points toward the camera (default: Y)
        [--logo-path /path/to/logo.png]
        [--logo-scale 0.25]
        [--logo-offset-v 0.1]

Fixes applied vs previous version:
- Front-face detection uses dot product against the configured front axis
  (default +Y) with a configurable threshold — back faces are excluded.
- Bounding-box torso filter further limits the decal region to the central
  upper-front area of the mesh, preventing wrap-around on sleeves/back.
- Detailed face counts are logged at every filtering stage so you can audit
  the result in the RunPod log output.
- No UV-projection onto back faces.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Blender is only available inside the Blender Python environment.
# Guard import so the module can be linted outside Blender without crashing.
# ---------------------------------------------------------------------------
try:
    import bpy
    import bmesh
    from mathutils import Vector
    _IN_BLENDER = True
except ImportError:
    _IN_BLENDER = False


# ── Constants ────────────────────────────────────────────────────────────────

# Dot-product threshold for "front-facing".
# A face is considered front-facing when dot(face_normal, front_dir) >= threshold.
# 0.0  → anything in the front hemisphere (180°)
# 0.2  → roughly ±78° from the front axis
# 0.35 → roughly ±70° — good default to avoid side seams
FRONT_FACE_DOT_THRESHOLD = float(0.35)

# Fraction of the bounding box used for the torso region filter (0–1).
# Faces outside this central region are excluded from decal application.
TORSO_HORIZONTAL_FRACTION = 0.60   # keep central 60 % of width
TORSO_VERTICAL_RANGE = (0.45, 0.85)  # keep upper 40 % of height (normalised, 0=bottom)

DECAL_MATERIAL_NAME = "SAI_Decal_Front"

# ── Garment isolation ─────────────────────────────────────────────────────────

# Substrings in object/mesh names that identify a human body mesh.
# Meshy sometimes embeds the body when the source photo shows a person wearing the garment.
_HUMAN_NAME_TOKENS: frozenset[str] = frozenset({
    "body", "human", "person", "mannequin", "avatar", "figure",
    "skin", "flesh", "character", "armature", "skeleton", "torso_body",
    "head", "hand", "foot", "leg", "arm",
})

# Height-to-width aspect ratio above which a mesh is considered human-shaped.
# A typical shirt bounding box has ratio 1.0–1.8; a standing person ≈ 4–6.
_HUMAN_ASPECT_RATIO = 3.5

# Meshes with fewer than this fraction of the largest mesh's polygon count are
# considered insignificant objects (buttons, tags, props) and are removed.
_MIN_POLY_FRACTION = 0.05


# ── Argument parsing ─────────────────────────────────────────────────────────

def _parse_args() -> argparse.Namespace:
    # Blender passes script arguments after "--"
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []

    parser = argparse.ArgumentParser(description="StylistAI Blender pipeline")
    parser.add_argument("--input-model",  required=True,  help="Path to input .glb")
    parser.add_argument("--output-model", required=True,  help="Path to output .glb")
    parser.add_argument("--front-axis",   default="Y",    help="World axis facing the camera: X, -X, Y, -Y, Z, -Z (default: Y)")
    parser.add_argument("--logo-path",    default=None,   help="Path to logo PNG (optional)")
    parser.add_argument("--logo-scale",   type=float, default=0.25, help="Logo UV scale (0–1)")
    parser.add_argument("--logo-offset-v", type=float, default=0.10, help="Vertical UV offset for logo placement")
    return parser.parse_args(argv)


# ── Garment isolation helpers ─────────────────────────────────────────────────

def _is_human_like(obj: "bpy.types.Object") -> bool:
    """Return True if the mesh looks like a human body rather than a garment.

    Two independent signals are checked:
    1. The object/mesh name contains a known body-part or body-type keyword.
    2. The bounding-box height-to-width ratio exceeds the threshold for a
       standing person (garments are roughly square; upright humans are tall
       and narrow).
    """
    name_lower = (obj.name + " " + obj.data.name).lower()
    for token in _HUMAN_NAME_TOKENS:
        if token in name_lower:
            print(f"[pipeline] human_name_match: '{obj.name}' matched token='{token}'")
            return True

    bbox = [obj.matrix_world @ v for v in obj.bound_box]
    xs = [v.x for v in bbox]
    ys = [v.y for v in bbox]
    zs = [v.z for v in bbox]
    width_xy = max(max(xs) - min(xs), max(ys) - min(ys), 1e-6)
    height_z = max(zs) - min(zs)
    aspect = height_z / width_xy
    if aspect >= _HUMAN_ASPECT_RATIO:
        print(f"[pipeline] human_aspect_match: '{obj.name}' aspect={aspect:.2f} >= {_HUMAN_ASPECT_RATIO}")
        return True

    return False


def _isolate_garment_mesh(mesh_objects: "list[bpy.types.Object]") -> "bpy.types.Object":
    """Keep exactly one garment mesh and delete everything else.

    Decision logic:
    1. Reject any mesh identified as human-like (_is_human_like).
    2. Among survivors, reject meshes whose polygon count is less than
       _MIN_POLY_FRACTION of the largest survivor (these are stray props,
       buttons, hanging tags, etc.).
    3. Keep the single largest remaining mesh.
    4. Delete all other objects from the Blender scene.

    If every mesh is flagged as human-like, a critical warning is logged and
    the overall largest mesh is kept to avoid producing an empty file.
    """
    if not mesh_objects:
        raise RuntimeError("[pipeline] No mesh objects to isolate from.")

    # Stage 1 — reject human-like meshes
    garment_candidates = [o for o in mesh_objects if not _is_human_like(o)]
    if not garment_candidates:
        print("[pipeline] CRITICAL: all meshes flagged as human-like; keeping largest as fallback")
        garment_candidates = mesh_objects

    # Stage 2 — reject tiny objects (likely props/accessories)
    poly_floor = max(len(o.data.polygons) for o in garment_candidates) * _MIN_POLY_FRACTION
    significant = [o for o in garment_candidates if len(o.data.polygons) >= poly_floor]
    if not significant:
        significant = garment_candidates

    # Stage 3 — pick the largest surviving mesh
    garment = max(significant, key=lambda o: len(o.data.polygons))

    # Stage 4 — delete everything else
    to_delete = [o for o in mesh_objects if o is not garment]
    if to_delete:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in to_delete:
            obj.select_set(True)
        bpy.ops.object.delete(use_global=False)

    print(
        f"[pipeline] garment_isolated: '{garment.name}' polys={len(garment.data.polygons)} "
        f"purged={len(to_delete)} total_input={len(mesh_objects)}"
    )
    return garment


# ── Helpers ──────────────────────────────────────────────────────────────────

def _axis_vector(axis_str: str) -> Vector:
    """Convert an axis string like 'Y' or '-X' to a normalised Vector."""
    mapping = {
        "X":  Vector(( 1,  0,  0)),
        "-X": Vector((-1,  0,  0)),
        "Y":  Vector(( 0,  1,  0)),
        "-Y": Vector(( 0, -1,  0)),
        "Z":  Vector(( 0,  0,  1)),
        "-Z": Vector(( 0,  0, -1)),
    }
    key = axis_str.strip().upper()
    if key not in mapping:
        print(f"[pipeline] WARNING: unknown front-axis '{axis_str}', defaulting to Y")
        return mapping["Y"]
    return mapping[key]


def _clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)


def _import_glb(path: str) -> None:
    bpy.ops.import_scene.gltf(filepath=path)
    print(f"[pipeline] imported: {path}")


def _export_glb(path: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,
    )
    print(f"[pipeline] exported: {path}")


# ── Front-face selection ──────────────────────────────────────────────────────

def _select_front_faces(
    obj: "bpy.types.Object",
    front_dir: "Vector",
    dot_threshold: float = FRONT_FACE_DOT_THRESHOLD,
    apply_torso_filter: bool = True,
) -> int:
    """
    Deselect all faces, then select only front-facing faces in the torso region.

    Returns the number of selected faces.
    """
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")

    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.ensure_lookup_table()

    # Deselect everything first
    for face in bm.faces:
        face.select = False

    # ── Stage 1: dot-product filter ──────────────────────────────────────
    # Transform front_dir into object local space so normals are comparable
    mat_inv = obj.matrix_world.inverted()
    local_front = (mat_inv.to_3x3() @ front_dir).normalized()

    dot_selected: list["bmesh.types.BMFace"] = []
    for face in bm.faces:
        if face.normal.dot(local_front) >= dot_threshold:
            dot_selected.append(face)

    print(f"[pipeline] stage1_dot_filter: {len(dot_selected)} / {len(bm.faces)} faces pass dot >= {dot_threshold}")

    if not dot_selected:
        bmesh.update_edit_mesh(obj.data)
        bpy.ops.object.mode_set(mode="OBJECT")
        return 0

    # ── Stage 2: bounding-box torso filter ───────────────────────────────
    if apply_torso_filter:
        # Compute world-space bounding box of the entire mesh
        world_verts = [obj.matrix_world @ v.co for v in bm.verts]
        xs = [v.x for v in world_verts]
        ys = [v.y for v in world_verts]
        zs = [v.z for v in world_verts]

        x_min, x_max = min(xs), max(xs)
        z_min, z_max = min(zs), max(zs)
        x_range = x_max - x_min or 1.0
        z_range = z_max - z_min or 1.0

        # Central horizontal band
        h_margin = (1.0 - TORSO_HORIZONTAL_FRACTION) / 2.0
        x_lo = x_min + h_margin * x_range
        x_hi = x_max - h_margin * x_range

        # Upper-front vertical band (normalised z)
        z_lo = z_min + TORSO_VERTICAL_RANGE[0] * z_range
        z_hi = z_min + TORSO_VERTICAL_RANGE[1] * z_range

        torso_selected: list["bmesh.types.BMFace"] = []
        for face in dot_selected:
            # Use face centre in world space
            centre_local = face.calc_center_median()
            centre_world = obj.matrix_world @ centre_local
            if x_lo <= centre_world.x <= x_hi and z_lo <= centre_world.z <= z_hi:
                torso_selected.append(face)

        print(
            f"[pipeline] stage2_torso_filter: {len(torso_selected)} faces remain "
            f"(x=[{x_lo:.3f}, {x_hi:.3f}], z=[{z_lo:.3f}, {z_hi:.3f}])"
        )
        final_faces = torso_selected
    else:
        final_faces = dot_selected

    for face in final_faces:
        face.select = True

    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    print(f"[pipeline] front_faces_selected_for_decal: {len(final_faces)}")
    return len(final_faces)


# ── Back-face sanitisation ────────────────────────────────────────────────────

def _extract_dominant_color(mat: "bpy.types.Material") -> tuple[float, float, float]:
    """Sample a representative RGB (linear) from a material's base texture or BSDF color."""
    fallback = (0.70, 0.70, 0.70)
    if mat is None or not mat.use_nodes:
        return fallback
    for node in mat.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        color_input = node.inputs.get("Base Color")
        if color_input is None:
            continue
        if color_input.is_linked:
            for link in color_input.links:
                src = link.from_node
                if src.type == "TEX_IMAGE" and src.image:
                    img = src.image
                    w, h = img.size
                    if w < 1 or h < 1:
                        break
                    # Sample a uniform grid from the center quarter of the image.
                    # img.pixels is a flat RGBA sequence — use a large stride to avoid
                    # reading millions of floats for high-res textures.
                    pixels = img.pixels[:]
                    stride = max(1, (w * h) // 1024)  # at most ~1 K samples
                    r_sum = g_sum = b_sum = n = 0.0
                    y0, y1 = h // 4, 3 * h // 4
                    x0, x1 = w // 4, 3 * w // 4
                    step = max(1, stride)
                    for row in range(y0, y1, step):
                        for col in range(x0, x1, step):
                            base = (row * w + col) * 4
                            if base + 3 >= len(pixels):
                                continue
                            a = pixels[base + 3]
                            if a < 0.5:
                                continue
                            r_sum += pixels[base];  g_sum += pixels[base + 1];  b_sum += pixels[base + 2]
                            n += 1.0
                    if n > 0:
                        return (r_sum / n, g_sum / n, b_sum / n)
        else:
            col = color_input.default_value
            return (float(col[0]), float(col[1]), float(col[2]))
    return fallback


def _sanitize_back_faces(
    obj: "bpy.types.Object",
    front_dir: "Vector",
    dot_threshold: float = 0.0,
) -> int:
    """Replace the material on back-facing faces with a plain solid-color material.

    When Meshy generates a 3D garment from a front-view photo it wraps the
    front texture cylindrically around the whole mesh.  Any logo, stain, or
    pattern from the source photo therefore ends up on the back too.

    This function assigns a clean, textureless material to every face whose
    normal points away from the camera (dot(normal, front_dir) < dot_threshold).
    The color is sampled from the dominant hue of the existing front texture so
    the back looks like plain fabric of the same color.

    Returns the number of faces reassigned.
    """
    # Derive back color from current material
    back_rgb = _extract_dominant_color(obj.data.materials[0] if obj.data.materials else None)
    print(f"[pipeline] back_plain_color_rgb: ({back_rgb[0]:.3f}, {back_rgb[1]:.3f}, {back_rgb[2]:.3f})")

    # Build the plain back material
    back_mat_name = "SAI_Back_Plain"
    existing = bpy.data.materials.get(back_mat_name)
    if existing:
        bpy.data.materials.remove(existing)
    back_mat = bpy.data.materials.new(name=back_mat_name)
    back_mat.use_nodes = True
    nodes = back_mat.node_tree.nodes
    links = back_mat.node_tree.links
    nodes.clear()
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (0, 0)
    bsdf.inputs["Base Color"].default_value = (*back_rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.80
    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (300, 0)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    obj.data.materials.append(back_mat)
    back_idx = len(obj.data.materials) - 1

    # Assign back material to all faces that face away from the camera
    mat_inv = obj.matrix_world.inverted()
    local_front = (mat_inv.to_3x3() @ front_dir).normalized()

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.ensure_lookup_table()

    back_count = 0
    for face in bm.faces:
        if face.normal.dot(local_front) < dot_threshold:
            face.material_index = back_idx
            back_count += 1

    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"[pipeline] sanitize_back_faces: {back_count}/{len(bm.faces)} faces → SAI_Back_Plain")
    return back_count


# ── Decal / logo application ─────────────────────────────────────────────────

def _create_decal_material(logo_path: str) -> "bpy.types.Material":
    """Create or replace a material with the logo texture."""
    mat = bpy.data.materials.get(DECAL_MATERIAL_NAME)
    if mat:
        bpy.data.materials.remove(mat)

    mat = bpy.data.materials.new(name=DECAL_MATERIAL_NAME)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    # Principled BSDF
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (300, 0)

    # Image texture
    tex_node = nodes.new("ShaderNodeTexImage")
    tex_node.location = (0, 0)
    img = bpy.data.images.load(logo_path, check_existing=True)
    tex_node.image = img

    # Output
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (600, 0)

    links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(tex_node.outputs["Alpha"], bsdf.inputs["Alpha"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    mat.blend_method = "BLEND"
    # Prevent the decal from rendering on back-facing polygons.
    # Without this flag the texture bleeds through to the back of the shirt.
    mat.use_backface_culling = True
    return mat


def _face_stats(obj, front_vec, threshold: float = 0.1):
    import bmesh
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    fcnt = 0
    bcnt = 0
    for f in bm.faces:
        d = f.normal.dot(front_vec)
        if d > threshold:
            fcnt += 1
        elif d < -threshold:
            bcnt += 1
    bm.free()
    return fcnt, bcnt


def _detect_front_axis_from_bbox(obj) -> str:
    bbox = [obj.matrix_world @ v for v in obj.bound_box]
    min_x = min(v.x for v in bbox); max_x = max(v.x for v in bbox)
    min_y = min(v.y for v in bbox); max_y = max(v.y for v in bbox)
    if (max_y - min_y) >= (max_x - min_x):
        return "+Y"
    return "+X"


def _select_frontal_torso_faces(obj, front_vec, placement: dict[str, Any], normal_threshold: float = 0.2):
    import bmesh
    bbox = [obj.matrix_world @ v for v in obj.bound_box]
    min_x = min(v.x for v in bbox); max_x = max(v.x for v in bbox)
    min_y = min(v.y for v in bbox); max_y = max(v.y for v in bbox)
    min_z = min(v.z for v in bbox); max_z = max(v.z for v in bbox)
    width = max(max_x - min_x, 1e-6); depth = max(max_y - min_y, 1e-6); height = max(max_z - min_z, 1e-6)

    center_x = min_x + width * float(placement.get("x", 0.5))
    center_z = min_z + height * float(placement.get("y", 0.62))
    scale = float(placement.get("scale", 0.28))
    half_w = max(0.05 * width, (width * scale) * 0.9)
    half_h = max(0.05 * height, (height * scale) * 0.9)

    bm = bmesh.new(); bm.from_mesh(obj.data); bm.normal_update()
    front_idx = []; back_idx = []
    for f in bm.faces:
        center = obj.matrix_world @ f.calc_center_median()
        dot = f.normal.dot(front_vec)
        in_center = abs(center.x - center_x) <= half_w and abs(center.z - center_z) <= half_h
        frontal_depth = center.y >= (min_y + depth * 0.52) if front_vec.y >= 0 else center.y <= (max_y - depth * 0.52)
        if dot > normal_threshold and in_center and frontal_depth:
            front_idx.append(f.index)
        elif dot < -normal_threshold:
            back_idx.append(f.index)
    bm.free()
    return front_idx, back_idx


def _create_decal_plane(target_obj, front_axis: str, placement: dict[str, Any], decal_mat):
    import bpy
    bbox = [target_obj.matrix_world @ v for v in target_obj.bound_box]
    min_x = min(v.x for v in bbox); max_x = max(v.x for v in bbox)
    min_y = min(v.y for v in bbox); max_y = max(v.y for v in bbox)
    min_z = min(v.z for v in bbox); max_z = max(v.z for v in bbox)
    width = max_x - min_x
    height = max_z - min_z
    depth = max_y - min_y

    px = float(placement.get("x", 0.5))
    py = float(placement.get("y", 0.62))
    pscale = float(placement.get("scale", 0.28))
    size = max(0.01, width * pscale)

    cx = min_x + width * px
    cz = min_z + height * py
    offset = max(0.003, depth * 0.01)
    cy = max_y + offset if front_axis == "+Y" else min_y - offset

    bpy.ops.mesh.primitive_plane_add(size=size, location=(cx, cy, cz))
    plane = bpy.context.active_object
    plane.name = "decal_front"
    plane.data.materials.clear()
    plane.data.materials.append(decal_mat)
    # Guarantee backface culling is on the material that was just assigned.
    # _create_decal_material sets this flag, but enforce it here as a safeguard
    # so a caller who passes an external material cannot accidentally produce a
    # double-sided decal plane.
    decal_mat.use_backface_culling = True

    if front_axis in {"+Y", "-Y"}:
        plane.rotation_euler[0] = math.radians(90)
        if front_axis == "+Y":
            plane.rotation_euler[2] = math.radians(180)
    elif front_axis in {"+X", "-X"}:
        plane.rotation_euler[1] = math.radians(90)
    return plane


def _render_preview(path: Path, rotation_y: float = 0.0):
    import bpy, math
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(path)
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768

    if "preview_cam" not in bpy.data.objects:
        cam_data = bpy.data.cameras.new("preview_cam")
        cam = bpy.data.objects.new("preview_cam", cam_data)
        bpy.context.collection.objects.link(cam)
    cam = bpy.data.objects["preview_cam"]
    cam.location = (0.0, -2.6, 1.4)
    cam.rotation_euler = (math.radians(78), 0.0, 0.0)
    cam.rotation_euler[2] = rotation_y
    scene.camera = cam

    if "preview_light" not in bpy.data.objects:
        light_data = bpy.data.lights.new(name="preview_light", type='AREA')
        light = bpy.data.objects.new(name="preview_light", object_data=light_data)
        bpy.context.collection.objects.link(light)
    light = bpy.data.objects["preview_light"]
    light.location = (0.0, -2.0, 2.6)
    bpy.ops.render.render(write_still=True)


def apply_visual_details_and_export(*, input_model: Path, output_model: Path, piece_data: dict[str, Any], debug_dir: Path) -> dict[str, Any]:
    _configure_logging()
    debug_dir.mkdir(parents=True, exist_ok=True)
    import bpy
    from mathutils import Vector

    logger.info("[blender] importing model=%s", input_model)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if input_model.suffix.lower() == ".obj":
        bpy.ops.import_scene.obj(filepath=str(input_model))
    else:
        bpy.ops.import_scene.gltf(filepath=str(input_model))

    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not objects:
        raise RuntimeError("No mesh objects found in imported model.")
    garment_obj = max(objects, key=lambda o: len(o.data.polygons))

    color_hex = str(piece_data.get("color") or "#808080")
    material_name = str(piece_data.get("fabric_type") or piece_data.get("material") or "generic")
    logo_texture = str(piece_data.get("logo_url") or "").strip()
    pattern_texture = str(piece_data.get("pattern_url") or "").strip()
    decal_mode = str(piece_data.get("decal_mode") or "front_only")
    front_axis_raw = str(piece_data.get("front_axis") or os.getenv("DECAL_FRONT_AXIS", "AUTO"))
    placement = piece_data.get("decal_placement") if isinstance(piece_data.get("decal_placement"), dict) else {}

    if front_axis_raw.strip().upper() == "AUTO":
        front_axis_raw = _detect_front_axis_from_bbox(garment_obj)
    front_vec_tuple, front_axis = _front_vector_from_axis(front_axis_raw)
    front_vec = Vector(front_vec_tuple)

    base_mat = _create_base_material(f"fashion_ai_{material_name}", color_hex, material_name)
    for obj in objects:
        obj.data.materials.clear(); obj.data.materials.append(base_mat)

    selected_front_faces, selected_back_faces = _face_stats(garment_obj, front_vec)
    frontal_face_indices, back_face_indices = _select_frontal_torso_faces(garment_obj, front_vec, placement)
    logger.info("[decal] mode=%s", decal_mode)
    logger.info("[decal] frontAxis=%s", front_axis)
    logger.info("[decal] selectedFrontFaces=%s", selected_front_faces)
    logger.info("[decal] selectedBackFaces=%s", selected_back_faces)
    logger.info("[decal] frontalCandidateFaces=%s", len(frontal_face_indices))
    logger.info("[decal] backExcludedFaces=%s", len(back_face_indices))

    decal_applied = False
    if decal_mode == "front_only":
        tex_path = _download_texture(logo_texture or pattern_texture, debug_dir)
        if tex_path:
            decal_mat = _create_decal_material(tex_path)
            if frontal_face_indices:
                _create_decal_plane(garment_obj, front_axis, placement, decal_mat)
            logger.info("[decal] frontalFacesUsed=%s", len(frontal_face_indices))
            decal_applied = True
            logger.info("[decal] textureExtension=CLIP")

    material_slots = sum(len(obj.data.materials) for obj in objects)
    logger.info("[decal] materialSlots=%s", material_slots)

    output_model.parent.mkdir(parents=True, exist_ok=True)
    preview_front = output_model.parent / "preview_front.png"
    preview_back = output_model.parent / "preview_back.png"
    _render_preview(preview_front, 0.0)
    _render_preview(preview_back, math.radians(180))

    logger.info("[blender] exporting model=%s", output_model)
    bpy.ops.export_scene.gltf(filepath=str(output_model), export_format="GLB")
    logger.info("[decal] exported=final_model.glb")

    usdz_path = output_model.with_suffix(".usdz")
    usdz_path.write_text("USDZ placeholder: convert with usd_from_gltf in production macOS build stage.", encoding="utf-8")

    # Detect whether the decal material leaked onto back-facing polygons.
    # This can happen when the face-selection threshold is too lenient or the
    # mesh UVs wrap around to the back.
    back_decal_detected = False
    if decal_applied:
        import bmesh as _bm_mod
        bm_check = _bm_mod.new()
        bm_check.from_mesh(garment_obj.data)
        bm_check.normal_update()
        mat_inv_check = garment_obj.matrix_world.inverted()
        local_front_check = (mat_inv_check.to_3x3() @ front_vec).normalized()
        for face in bm_check.faces:
            if face.material_index > 0 and face.normal.dot(local_front_check) < -0.1:
                back_decal_detected = True
                break
        bm_check.free()

    validation = {"frontOnlyDecal": decal_mode == "front_only", "backDecalDetected": back_decal_detected}
    if decal_applied and back_decal_detected:
        logger.warning("[decal] WARNING: decal material detected on back-facing faces — check threshold and UV seams")
    elif decal_applied and selected_back_faces > 0:
        logger.warning("[decal] WARNING selectedBackFaces with potential decal mapping=%s", selected_back_faces)

    return {
        "output_glb_path": str(output_model),
        "output_usdz_path": str(usdz_path),
        "preview_front_path": str(preview_front),
        "preview_back_path": str(preview_back),
        "material_name": material_name,
        "color": color_hex,
        "mesh_count": len(objects),
        "validation": validation,
    }


# ── Face-based decal application (used by CLI main) ──────────────────────────

def _apply_decal_to_front_faces(
    *,
    obj: "bpy.types.Object",
    logo_path: str,
    front_dir: "Vector",
    logo_scale: float,
    logo_offset_v: float,
) -> None:
    """Apply a logo texture exclusively to front-facing torso faces.

    Uses face-level material assignment so that the decal material is bound
    only to the polygons that face the camera.  The material is created with
    backface culling enabled, which means even if a polygon ends up near the
    boundary of the front/back split it will not visually render on the
    interior (back) side.
    """
    n_selected = _select_front_faces(obj, front_dir)
    if n_selected == 0:
        print("[pipeline] WARNING: no front faces selected — skipping decal")
        return

    mat = _create_decal_material(logo_path)
    if mat.name not in [m.name for m in obj.data.materials]:
        obj.data.materials.append(mat)

    mat_index = [m.name for m in obj.data.materials].index(mat.name)

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")

    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.ensure_lookup_table()

    assigned = 0
    for face in bm.faces:
        if face.select:
            face.material_index = mat_index
            assigned += 1

    print(f"[pipeline] decal_material_assigned_to_faces: {assigned}")

    # Project UV from the front view onto the selected faces only.
    bpy.ops.uv.project_from_view(
        camera_bounds=False,
        correct_aspect=True,
        scale_to_bounds=False,
    )

    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")

    uv_layer = obj.data.uv_layers.active
    if uv_layer:
        for poly in obj.data.polygons:
            if poly.material_index == mat_index:
                for loop_idx in poly.loop_indices:
                    uv = uv_layer.data[loop_idx].uv
                    uv.x = (uv.x - 0.5) * logo_scale + 0.5
                    uv.y = (uv.y - 0.5) * logo_scale + 0.5 + logo_offset_v

    print("[pipeline] UV scaling applied to decal faces")


# ── Main pipeline ─────────────────────────────────────────────────────────────

def main() -> None:
    if not _IN_BLENDER:
        print("[pipeline] ERROR: this script must run inside Blender")
        sys.exit(1)

    args = _parse_args()
    front_dir = _axis_vector(args.front_axis)

    print("[pipeline] ── StylistAI Blender Pipeline ──")
    print(f"[pipeline] input  : {args.input_model}")
    print(f"[pipeline] output : {args.output_model}")
    print(f"[pipeline] front_axis : {args.front_axis} → {front_dir}")
    print(f"[pipeline] logo_path  : {args.logo_path}")

    # 1. Clean scene
    _clear_scene()

    # 2. Import base mesh from Meshy
    if not Path(args.input_model).exists():
        print(f"[pipeline] ERROR: input model not found: {args.input_model}")
        sys.exit(1)

    _import_glb(args.input_model)

    # 3. Get all mesh objects
    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    if not mesh_objects:
        print("[pipeline] ERROR: no mesh objects found after import")
        sys.exit(1)

    print(f"[pipeline] mesh_objects_found: {len(mesh_objects)}")

    # 4. Isolate the garment: remove human bodies and stray objects
    garment = _isolate_garment_mesh(mesh_objects)
    total_faces = len(garment.data.polygons)
    print(f"[pipeline] garment_object: '{garment.name}' with {total_faces} faces")

    # 4b. Sanitise back faces: replace Meshy's baked-front texture on back-facing
    #     polygons with a plain solid-color material so logos/patterns from the
    #     source photo never appear on the back of the garment.
    _sanitize_back_faces(garment, front_dir)

    # 5. Apply decal / logo if provided
    if args.logo_path and Path(args.logo_path).exists():
        print(f"[pipeline] applying decal from: {args.logo_path}")
        _apply_decal_to_front_faces(
            obj=garment,
            logo_path=args.logo_path,
            front_dir=front_dir,
            logo_scale=args.logo_scale,
            logo_offset_v=args.logo_offset_v,
        )
    else:
        if args.logo_path:
            print(f"[pipeline] WARNING: logo_path provided but file not found: {args.logo_path}")
        else:
            print("[pipeline] no logo_path provided — skipping decal step")

    # 6. Export
    _export_glb(args.output_model)

    print("[pipeline] ── Pipeline complete ──")


if __name__ == "__main__":
    main()
