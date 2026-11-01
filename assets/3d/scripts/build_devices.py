"""Headless Blender models for the isometric prototype.

Units: 1.0 = one homepage cell. Z is up. The front of each device faces -Y.
Run: blender --background --python assets/3d/scripts/build_devices.py
"""
import math
import os
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BLEND_DIR = os.path.join(ROOT, "blend")
GLB_DIR = os.path.join(ROOT, "models")


def srgb_to_linear(rgb):
    def f(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4
    return tuple(f(c) for c in rgb)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def clay(name, rgb, roughness=0.58, specular=0.38):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = srgb_to_linear(rgb) + (1.0,)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = specular
    return mat


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def smooth(obj):
    activate(obj)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(42))
    except Exception:
        bpy.ops.object.shade_smooth()


def box(name, dims, loc, mat, bevel=0.006, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dims
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel and min(dims) > bevel * 5:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(48)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    smooth(obj)
    assign(obj, mat)
    return obj


def cyl(name, radius, depth, loc, mat, rot=(math.pi / 2, 0, 0), verts=28, bevel=0):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot
    )
    obj = bpy.context.active_object
    obj.name = name
    if bevel and radius > bevel * 3:
        activate(obj)
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(40)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    smooth(obj)
    assign(obj, mat)
    return obj


def screen_plane(dims, loc):
    """A display facing -Y. dims is (width, height). Local Y becomes world Z."""
    bpy.ops.mesh.primitive_plane_add(
        size=1, location=loc, rotation=(math.pi / 2, 0, 0)
    )
    obj = bpy.context.active_object
    obj.name = "Screen"
    obj.scale = (dims[0], dims[1], 1)
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mat = clay("Screen", (1, 1, 1), roughness=0.35, specular=0.2)
    assign(obj, mat)
    # The rotated plane's UV comes out upside down in glTF.
    layer = obj.data.uv_layers.active
    for datum in layer.data:
        datum.uv.y = 1.0 - datum.uv.y
    return obj


def front_y(body_depth, thickness, embed=0.0015):
    """Center Y for a part of `thickness` stuck onto the front (-Y) face."""
    front = -body_depth / 2
    return front + embed - thickness / 2


def build_handheld():
    reset()
    # DMG proportions: 90 × 148 × 32 mm. Height matches the SVG silhouette.
    w, d, h = 0.312, 0.110, 0.510
    shell = clay("Shell", (0.78, 0.79, 0.71), 0.56)
    shell_dark = clay("ShellDark", (0.62, 0.63, 0.55), 0.6)
    bezel = clay("Bezel", (0.10, 0.12, 0.09), 0.45)
    pad = clay("Pad", (0.16, 0.18, 0.15), 0.48)
    btn = clay("Button", (0.72, 0.32, 0.36), 0.42)
    led = clay("Led", (0.78, 0.22, 0.20), 0.32, specular=0.5)
    slot = clay("Slot", (0.12, 0.13, 0.11), 0.7)

    box("Body", (w, d, h), (0, 0, h / 2), shell, bevel=0.014, segments=4)
    # Slightly darker lower belly, so the brick reads as two plastics.
    box("Belly", (w * 0.985, d * 0.55, h * 0.42), (0, d * 0.12, h * 0.22), shell_dark, bevel=0.01, segments=2)

    sy = front_y(d, 0.008)
    box("ScreenWell", (0.20, 0.008, 0.15), (-0.012, sy, h * 0.70), bezel, bevel=0.003, segments=2)
    screen_plane((0.176, 0.126), (-0.012, sy - 0.0045, h * 0.70))

    # Speaker slits to the right of the glass.
    for i, zoff in enumerate((-0.045, -0.02, 0.005, 0.03)):
        box(
            "Slit%d" % i,
            (0.012, 0.006, 0.028),
            (0.118, front_y(d, 0.006), h * 0.70 + zoff),
            slot,
            bevel=0.001,
            segments=1,
        )
    cyl("Led", 0.006, 0.006, (-0.12, front_y(d, 0.006), h * 0.90), led, bevel=0.001)

    # D-pad.
    px, pz = -0.078, h * 0.30
    box("DpadH", (0.078, 0.010, 0.026), (px, front_y(d, 0.010), pz), pad, bevel=0.004, segments=2)
    box("DpadV", (0.026, 0.010, 0.078), (px, front_y(d, 0.010), pz), pad, bevel=0.004, segments=2)
    cyl("DpadNub", 0.008, 0.012, (px, front_y(d, 0.012), pz), pad)

    cyl("A", 0.018, 0.010, (0.078, front_y(d, 0.010), h * 0.34), btn)
    cyl("B", 0.018, 0.010, (0.112, front_y(d, 0.010), h * 0.27), btn)
    box("Select", (0.032, 0.006, 0.012), (-0.012, front_y(d, 0.006), h * 0.16), slot, bevel=0.003, segments=1)
    box("Start", (0.032, 0.006, 0.012), (0.028, front_y(d, 0.006), h * 0.145), slot, bevel=0.003, segments=1)
    save_and_export("handheld")


def build_macintosh():
    reset()
    # Compact Mac: about 9.6 × 13.6 × 10.9 in. Height close to the SVG.
    w, d, h = 0.360, 0.400, 0.500
    beige = clay("Beige", (0.90, 0.84, 0.75), 0.55)
    beige_side = clay("BeigeSide", (0.78, 0.70, 0.58), 0.58)
    bezel = clay("Bezel", (0.07, 0.07, 0.07), 0.4)
    slotm = clay("Slot", (0.16, 0.14, 0.12), 0.65)
    foot = clay("Foot", (0.62, 0.55, 0.45), 0.6)

    box("Body", (w, d, h * 0.94), (0, 0, h * 0.50), beige, bevel=0.012, segments=3)
    # Darker side slab so the depth reads before the light does.
    box("Side", (0.012, d * 0.92, h * 0.86), (w / 2 - 0.002, 0, h * 0.50), beige_side, bevel=0.002, segments=1)

    sy = front_y(d, 0.010)
    box("Bezel", (0.250, 0.010, 0.200), (0, sy, h * 0.64), bezel, bevel=0.004, segments=2)
    screen_plane((0.214, 0.164), (0, sy - 0.0055, h * 0.64))
    box("Slot", (0.200, 0.012, 0.016), (0, front_y(d, 0.012), h * 0.30), slotm, bevel=0.002, segments=1)
    box("SlotLip", (0.200, 0.008, 0.006), (0, front_y(d, 0.008) - 0.002, h * 0.284), beige, bevel=0.0, segments=1)
    box("FootL", (0.078, 0.100, 0.024), (-0.09, -0.14, 0.012), foot, bevel=0.004, segments=2)
    box("FootR", (0.078, 0.100, 0.024), (0.09, -0.14, 0.012), foot, bevel=0.004, segments=2)
    save_and_export("macintosh")


def build_camera():
    reset()
    body_mat = clay("Body", (0.16, 0.17, 0.20), 0.42, specular=0.5)
    print_mat = clay("Print", (0.97, 0.95, 0.92), 0.72, specular=0.15)
    lens_mat = clay("Lens", (0.05, 0.06, 0.08), 0.18, specular=0.7)
    ring_mat = clay("Ring", (0.10, 0.11, 0.13), 0.3, specular=0.6)
    flash_mat = clay("Flash", (0.95, 0.93, 0.88), 0.28, specular=0.55)
    finder_mat = clay("Finder", (0.08, 0.12, 0.16), 0.25, specular=0.5)
    red = clay("Shutter", (0.78, 0.27, 0.24), 0.35, specular=0.5)
    slot_mat = clay("Mouth", (0.05, 0.05, 0.06), 0.6)

    # Envelope close to the SVG camera: wide body, print hanging below.
    bw, bd, bh = 0.520, 0.170, 0.230
    body_z = 0.340
    box("Body", (bw, bd, bh), (0, 0, body_z + bh / 2), body_mat, bevel=0.016, segments=4)

    pw, pd, ph = 0.400, 0.012, 0.330
    # Print emerges from the lower front and nearly reaches the ground.
    print_y = -bd / 2 + 0.004
    box("Print", (pw, pd, ph), (0, print_y, 0.012 + ph / 2), print_mat, bevel=0.002, segments=2)
    box("Mouth", (pw * 0.86, 0.008, 0.010), (0, -bd / 2 + 0.006, body_z + 0.012), slot_mat, bevel=0.001, segments=1)

    # Inner photo, inset so the print keeps a white border and a deeper chin.
    screen_plane((0.320, 0.230), (0, print_y - pd / 2 - 0.0005, 0.175))

    # Lens on the front-left of the body.
    lens_y = front_y(bd, 0.018)
    lens_z = body_z + bh * 0.48
    cyl("LensRing", 0.048, 0.016, (-0.07, lens_y, lens_z), ring_mat)
    cyl("Lens", 0.034, 0.020, (-0.07, lens_y - 0.004, lens_z), lens_mat)
    cyl("LensDot", 0.008, 0.006, (-0.084, lens_y - 0.012, lens_z + 0.014), flash_mat, verts=16)

    box("Finder", (0.070, 0.010, 0.040), (0.10, front_y(bd, 0.010), body_z + bh * 0.70), finder_mat, bevel=0.003, segments=2)
    box("Flash", (0.062, 0.012, 0.042), (0.105, front_y(bd, 0.012), body_z + bh * 0.38), flash_mat, bevel=0.003, segments=2)
    cyl(
        "Shutter",
        0.016,
        0.010,
        (0.18, -0.01, body_z + bh + 0.002),
        red,
        rot=(0, 0, 0),
        verts=20,
    )
    save_and_export("camera")


def save_and_export(name):
    os.makedirs(BLEND_DIR, exist_ok=True)
    os.makedirs(GLB_DIR, exist_ok=True)
    blend_path = os.path.join(BLEND_DIR, name + ".blend")
    glb_path = os.path.join(GLB_DIR, name + ".glb")
    faces = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == "MESH")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_materials="EXPORT",
    )
    print("BUILT", name, "faces", faces, "bytes", os.path.getsize(glb_path))


if __name__ == "__main__":
    build_handheld()
    build_macintosh()
    build_camera()
