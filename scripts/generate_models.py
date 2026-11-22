import bpy
import bmesh
import math
import os
import random
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "models")
BASE_HEIGHT = 0.2333
MODEL_STRETCH = {"blossom_tree": 1.15, "leafy_tree": 1.15}
MODEL_SLIM = {"stone_lantern": 0.78}
os.makedirs(OUT_DIR, exist_ok=True)

MATERIALS = {}
BASE_IDS = {
    "sandstone_tile",
    "slate_tile",
    "grass_tile",
    "water_basin",
    "stone_stairs",
}


def srgb(hex_color):
    value = hex_color.lstrip("#")
    channels = [int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]

    def linear(channel):
        if channel <= 0.04045:
            return channel / 12.92
        return ((channel + 0.055) / 1.055) ** 2.4

    return tuple(linear(channel) for channel in channels) + (1.0,)


def material(
    color,
    roughness=0.86,
    metallic=0.0,
    emission=None,
    strength=0.0,
    transmission=0.0,
    ior=1.45,
    alpha=1.0,
    clearcoat=0.0,
    clearcoat_roughness=0.03,
    name=None,
):
    key = (
        color,
        round(roughness, 3),
        round(metallic, 3),
        emission,
        round(strength, 2),
        round(transmission, 2),
        round(alpha, 2),
        round(clearcoat, 2),
        round(clearcoat_roughness, 2),
        name,
    )
    if key in MATERIALS:
        return MATERIALS[key]
    mat = bpy.data.materials.new(name or f"mat_{len(MATERIALS):03d}")
    mat.use_nodes = True
    mat.blend_method = "BLEND" if alpha < 1.0 else "OPAQUE"
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = srgb(color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["IOR"].default_value = ior
    bsdf.inputs["Alpha"].default_value = alpha
    if transmission > 0:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if clearcoat > 0:
        bsdf.inputs["Coat Weight"].default_value = clearcoat
        bsdf.inputs["Coat Roughness"].default_value = clearcoat_roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = srgb(emission)
        bsdf.inputs["Emission Strength"].default_value = strength
    MATERIALS[key] = mat
    return mat


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def add_material(obj, mat):
    if mat is not None:
        obj.data.materials.append(mat)


def smooth(obj, angle=36.0, full=False):
    if full:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        return
    select_only(obj)
    bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))


def add_bevel(obj, width=0.012, segments=3):
    if width <= 0:
        return
    modifier = obj.modifiers.new("soft_bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = math.radians(38)
    modifier.harden_normals = True
    modifier.use_clamp_overlap = True


def add_subsurf(obj, levels=1):
    modifier = obj.modifiers.new("soft_subdiv", "SUBSURF")
    modifier.levels = levels
    modifier.render_levels = levels


def cube(name, dims, location, mat, bevel=0.012, segments=3, rotation=(0, 0, 0), angle=36.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = dims
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_bevel(obj, min(bevel, min(dims) * 0.24), segments)
    add_material(obj, mat)
    smooth(obj, angle)
    return obj


def cylinder(
    name,
    radius,
    depth,
    location,
    mat,
    vertices=32,
    bevel=0.008,
    rotation=(0, 0, 0),
    scale=(1, 1, 1),
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_bevel(obj, min(bevel, depth * 0.2, radius * 0.4), 2)
    add_material(obj, mat)
    smooth(obj, 32)
    return obj


def ico(
    name,
    radius,
    location,
    mat,
    subdivisions=2,
    scale=(1, 1, 1),
    jitter=0.0,
    rotation=(0, 0, 0),
    seed=0,
):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions, radius=radius, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    select_only(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    rng = random.Random(seed)
    if jitter > 0:
        for vertex in obj.data.vertices:
            vertex.co += Vector(
                (
                    rng.uniform(-jitter, jitter),
                    rng.uniform(-jitter, jitter),
                    rng.uniform(-jitter, jitter),
                )
            )
    obj.rotation_euler = rotation
    add_material(obj, mat)
    smooth(obj, full=True)
    return obj


def torus(
    name,
    major_radius,
    minor_radius,
    location,
    mat,
    rotation=(0, 0, 0),
    major_segments=32,
    minor_segments=8,
):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=minor_segments,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    add_material(obj, mat)
    smooth(obj, full=True)
    return obj


def lathe(
    name,
    profile,
    location,
    mat,
    segments=48,
    scallop=0.0,
    scallop_count=8,
    scale_xy=(1.0, 1.0),
    rotation=(0, 0, 0),
    cap_bottom=True,
    cap_top=False,
    angle=38.0,
):
    vertices = []
    faces = []
    for radius, height in profile:
        for index in range(segments):
            angle_value = (2 * math.pi * index) / segments
            wave = 1.0 + scallop * math.cos(scallop_count * angle_value)
            vertices.append(
                (
                    radius * wave * math.cos(angle_value) * scale_xy[0],
                    radius * wave * math.sin(angle_value) * scale_xy[1],
                    height,
                )
            )
    for ring in range(len(profile) - 1):
        for index in range(segments):
            lower = ring * segments + index
            lower_next = ring * segments + ((index + 1) % segments)
            upper_next = (ring + 1) * segments + ((index + 1) % segments)
            upper = (ring + 1) * segments + index
            faces.append((lower, lower_next, upper_next, upper))
    if cap_bottom:
        faces.append(tuple(range(segments - 1, -1, -1)))
    if cap_top:
        start = (len(profile) - 1) * segments
        faces.append(tuple(range(start, start + segments)))

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.validate()
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    add_material(obj, mat)
    smooth(obj, angle)
    return obj


def tube(name, points, radius, mat, radii=None, resolution=12):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    curve.use_fill_caps = True
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for index, point in enumerate(points):
        point_data = spline.bezier_points[index]
        point_data.co = Vector(point)
        point_data.handle_left_type = "AUTO"
        point_data.handle_right_type = "AUTO"
        if radii:
            point_data.radius = radii[index]
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    select_only(obj)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    add_material(obj, mat)
    smooth(obj, full=True)
    return obj


def blossom_cluster(center, size, shades, seed):
    rng = random.Random(seed)
    x, y, z = center
    for index in range(7):
        angle_value = (index / 7.0) * math.tau + rng.uniform(-0.3, 0.3)
        distance = size * rng.uniform(0.25, 0.55)
        ico(
            f"blossom_{index}",
            size * rng.uniform(0.55, 0.8),
            (
                x + math.cos(angle_value) * distance,
                y + math.sin(angle_value) * distance,
                z + rng.uniform(-0.05, 0.1) * size,
            ),
            shades[index % len(shades)],
            subdivisions=2,
            scale=(1.05, 0.95, 0.82),
            jitter=size * 0.09,
            seed=seed * 10 + index,
        )


def rose_bloom(center, size, outer, inner, seed):
    rng = random.Random(seed)
    x, y, z = center
    ico(
        f"rose_core_{seed}",
        size * 0.38,
        (x, y, z),
        inner,
        subdivisions=1,
        scale=(1, 1, 0.85),
        jitter=size * 0.05,
        seed=seed,
    )
    for ring in range(2):
        count = 6 if ring == 0 else 5
        distance = size * (0.42 + 0.16 * ring)
        for index in range(count):
            angle_value = (index / count) * math.tau + ring * 0.45
            px = x + math.cos(angle_value) * distance
            py = y + math.sin(angle_value) * distance
            pz = z + size * (0.08 + ring * 0.05)
            ico(
                f"rose_petal_{seed}_{ring}_{index}",
                size * (0.32 if ring == 0 else 0.28),
                (px, py, pz),
                outer if index % 3 else inner,
                subdivisions=1,
                scale=(1.35, 0.8, 0.45),
                jitter=size * 0.04,
                rotation=(math.radians(26 + ring * 12), 0, angle_value),
                seed=seed * 50 + ring * 10 + index,
            )


def flame(name, location, height, radius, seed):
    rng = random.Random(seed)
    profile = []
    steps = 8
    for index in range(steps):
        t = index / (steps - 1)
        r = radius * math.sin(math.pi * (t**0.7)) * (1 - 0.55 * t) + 0.002
        profile.append((max(r, 0.002), height * t))
    material_flame = material("#FFA235", 0.5, emission="#FF7A24", strength=4.0)
    obj = lathe(name, profile, location, material_flame, segments=16, cap_bottom=True, cap_top=False, angle=70)
    obj.rotation_euler = (
        rng.uniform(-0.15, 0.15),
        rng.uniform(-0.15, 0.15),
        rng.uniform(-0.2, 0.2),
    )
    return obj


def make_sandstone():
    stone = material("#D9A773", 0.9)
    deep = material("#C08E5B", 0.9)
    cube("base_slab", (1.0, 1.0, 0.30), (0, 0, 0.15), deep, bevel=0.03, segments=4)
    tones = [
        material("#D9A773", 0.9),
        material("#CFA06C", 0.9),
    ]
    rng = random.Random(21)
    for index, x in enumerate((-0.225, 0.225)):
        height = 0.05
        cube(
            f"paver_{index}",
            (0.435, 0.955, height),
            (x + rng.uniform(-0.005, 0.005), 0.0, 0.30 + height / 2),
            tones[index],
            bevel=0.01,
            segments=3,
            rotation=(0, 0, math.radians(rng.uniform(-0.6, 0.6))),
            angle=40,
        )
    for pebble_index, (x, y) in enumerate(((-0.45, 0.45), (0.45, -0.45), (0.44, 0.44))):
        ico(
            f"pebble_{pebble_index}",
            0.018,
            (x, y, 0.31),
            stone,
            subdivisions=1,
            scale=(1.2, 0.9, 0.7),
            jitter=0.003,
            seed=30 + pebble_index,
        )


def make_slate():
    limestone = material("#C8C2B6", 0.9)
    top = material("#D2CCC0", 0.88)
    groove = material("#9C9588", 0.92)
    cube("slate_base", (1.0, 1.0, 0.30), (0, 0, 0.15), limestone, bevel=0.035, segments=4)
    cube("slate_inset", (0.88, 0.88, 0.05), (0, 0, 0.325), top, bevel=0.025, segments=4)
    for x, y, width, depth in (
        (0, -0.445, 0.9, 0.012),
        (0, 0.445, 0.9, 0.012),
        (-0.445, 0, 0.012, 0.9),
        (0.445, 0, 0.012, 0.9),
    ):
        cube(
            "border_groove",
            (width, depth, 0.008),
            (x, y, 0.349),
            groove,
            bevel=0.002,
            segments=2,
            angle=50,
        )


def make_grass():
    soil = material("#5C4B36", 0.95)
    turf = material("#86A34B", 0.9)
    cube("grass_base", (1.0, 1.0, 0.25), (0, 0, 0.125), soil, bevel=0.035, segments=4)
    cube("grass_turf", (0.985, 0.985, 0.025), (0, 0, 0.2625), turf, bevel=0.02, segments=3)
    rng = random.Random(52)
    petals = [
        material("#E9C7D2", 0.85),
        material("#A9B8E8", 0.85),
        material("#C9A0DC", 0.85),
        material("#F2D5C4", 0.85),
    ]
    placements = []
    for flower in range(7):
        for _ in range(60):
            angle_value = rng.uniform(0, math.tau)
            distance = math.sqrt(rng.uniform(0.02, 1)) * 0.38
            candidate = (
                math.cos(angle_value) * distance,
                math.sin(angle_value) * distance,
            )
            if all(
                (candidate[0] - px) ** 2 + (candidate[1] - py) ** 2 >= 0.19**2
                for px, py in placements
            ):
                break
        placements.append(candidate)
        x, y = candidate
        z = rng.uniform(0.305, 0.33)
        petal = petals[flower % len(petals)]
        for index in range(5):
            petal_angle = (index / 5.0) * math.tau
            ico(
                f"wildflower_{flower}_{index}",
                0.026,
                (x + math.cos(petal_angle) * 0.03, y + math.sin(petal_angle) * 0.03, z),
                petal,
                subdivisions=1,
                scale=(1.0, 0.65, 0.4),
                rotation=(0, 0, petal_angle),
                seed=flower * 10 + index,
            )
        ico(
            f"wildflower_center_{flower}",
            0.014,
            (x, y, z + 0.004),
            material("#E4C25E", 0.8),
            subdivisions=1,
            seed=flower,
        )


def make_water_basin():
    brick = material("#A68978", 0.92)
    brick_dark = material("#947768", 0.92)
    brick_light = material("#B39684", 0.9)
    basin_floor = material("#8E9B99", 0.94)
    inner_wall = material("#4A676E", 0.82)
    water = material(
        "#557D87",
        0.2,
        metallic=0.02,
        ior=1.45,
        alpha=0.65,
        clearcoat=0.12,
        clearcoat_roughness=0.18,
        name="water_surface",
    )
    cube("basin_floor", (1.0, 1.0, 0.10), (0, 0, 0.05), basin_floor, bevel=0.02, segments=3)
    for x, y, sx, sy in ((0.385, 0, 0.03, 0.77), (-0.385, 0, 0.03, 0.77), (0, 0.385, 0.77, 0.03), (0, -0.385, 0.77, 0.03)):
        cube("inner_wall", (sx, sy, 0.16), (x, y, 0.18), inner_wall, bevel=0.008, segments=2)
    brick_mats = [brick, brick_dark, brick_light]
    rng = random.Random(61)
    index = 0
    for side in (-1, 1):
        for offset in (-0.33, 0.0, 0.33):
            cube(
                f"brick_{index}",
                (0.10, 0.305, 0.25),
                (side * 0.45, offset, 0.225),
                brick_mats[index % 3],
                bevel=0.018,
                segments=3,
                rotation=(0, 0, math.radians(rng.uniform(-1, 1))),
                angle=38,
            )
            index += 1
            cube(
                f"brick_{index}",
                (0.305, 0.10, 0.25),
                (offset, side * 0.45, 0.225),
                brick_mats[index % 3],
                bevel=0.018,
                segments=3,
                rotation=(0, 0, math.radians(rng.uniform(-1, 1))),
                angle=38,
            )
            index += 1
    for x in (-0.45, 0.45):
        for y in (-0.45, 0.45):
            cube(
                f"corner_brick_{index}",
                (0.11, 0.11, 0.25),
                (x, y, 0.225),
                brick_dark,
                bevel=0.018,
                segments=3,
            )
            index += 1
    pebble_mats = (material("#636E70", 0.9), material("#A8B0AE", 0.9))
    for pebble_index, (x, y, radius) in enumerate(
        ((-0.22, -0.19, 0.048), (0.04, 0.21, 0.038), (0.24, 0.1, 0.043))
    ):
        ico(
            f"basin_pebble_{pebble_index}",
            radius,
            (x, y, 0.1 + radius * 0.45),
            pebble_mats[pebble_index % 2],
            subdivisions=2,
            scale=(1.0, 0.82, 0.5),
            jitter=0.003,
            rotation=(0, 0, pebble_index * 0.7),
            seed=300 + pebble_index,
        )

    segments = 18
    extent = 0.372
    verts = []
    for iy in range(segments + 1):
        y = -extent + 2 * extent * iy / segments
        for ix in range(segments + 1):
            x = -extent + 2 * extent * ix / segments
            z = 0.267 + 0.005 * math.sin(x * 5.5 + y * 3.4)
            verts.append((x, y, z))
    faces = []
    for iy in range(segments):
        for ix in range(segments):
            a = iy * (segments + 1) + ix
            faces.append((a, a + 1, a + segments + 2, a + segments + 1))
    mesh = bpy.data.meshes.new("water_surface")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    surface = bpy.data.objects.new("water_surface", mesh)
    bpy.context.collection.objects.link(surface)
    add_material(surface, water)
    smooth(surface, full=True)

    petal_pink = material("#E8A7B8", 0.85)
    flowers = ((-0.20, 0.14, 2.04), (-0.08, 0.04, 1.44), (0.18, -0.18, 1.8))
    for flower_index, (x, y, size) in enumerate(flowers):
        petal_radius = 0.013 * size
        spread = 0.014 * size
        petal_z = 0.2755 + 0.0065 * size
        for petal in range(5):
            angle = petal * math.tau / 5
            ico(
                f"water_flower_{flower_index}_{petal}",
                petal_radius,
                (x + math.cos(angle) * spread, y + math.sin(angle) * spread, petal_z),
                petal_pink,
                subdivisions=1,
                scale=(1.0, 1.0, 0.5),
                seed=70 + flower_index * 5 + petal,
            )


def make_stone_stairs():
    tones = [
        material("#D2B183", 0.9),
        material("#C7A576", 0.9),
        material("#DCBC8E", 0.9),
    ]
    heights = [0.117, 0.233, 0.35]
    for index, height in enumerate(heights):
        cube(
            f"stair_step_{index}",
            (0.975, 0.333, height),
            (0, -0.333 + index * 0.333, height / 2),
            tones[index],
            bevel=0.02,
            segments=3,
            angle=40,
        )
        cube(
            f"stair_tread_{index}",
            (0.945, 0.30, 0.012),
            (0, -0.333 + index * 0.333, height - 0.006),
            material("#E3C79D", 0.88),
            bevel=0.004,
            segments=2,
            angle=45,
        )


def make_stone_lantern():
    stone = material("#8A8075", 0.9)
    stone_base = material("#8C8377", 0.92)
    stone_dark = material("#5F574D", 0.94)
    stone_light = material("#A99D8C", 0.88)
    glow = material("#FFD7A0", 0.45, emission="#FFCE8A", strength=4.0)
    lathe(
        "lantern_foot",
        [(0.17, 0.0), (0.2, 0.018), (0.2, 0.05), (0.16, 0.075), (0.115, 0.095)],
        (0, 0, 0),
        stone_base,
        segments=28,
    )
    lathe(
        "lantern_post",
        [(0.085, 0.09), (0.065, 0.13), (0.055, 0.24), (0.065, 0.33), (0.09, 0.37)],
        (0, 0, 0),
        stone,
        segments=24,
    )
    cylinder("lantern_plate", 0.16, 0.035, (0, 0, 0.395), stone_light, vertices=24, bevel=0.008)
    cylinder("lantern_core", 0.1, 0.185, (0, 0, 0.5075), glow, vertices=24, bevel=0.004)
    for index in range(6):
        angle_value = (index / 6.0) * math.tau
        cube(
            f"lantern_lattice_{index}",
            (0.026, 0.026, 0.205),
            (math.cos(angle_value) * 0.142, math.sin(angle_value) * 0.142, 0.5075),
            stone,
            bevel=0.006,
            segments=2,
            rotation=(0, 0, angle_value),
            angle=45,
        )
    for level in (0.415, 0.6):
        torus(
            "lantern_ring",
            0.145,
            0.014,
            (0, 0, level),
            stone,
            major_segments=6,
            minor_segments=8,
        )
    cylinder("lantern_eave", 0.205, 0.028, (0, 0, 0.618), stone_dark, vertices=12, bevel=0.008)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.275, radius2=0.045, depth=0.145, location=(0, 0, 0.705))
    roof = bpy.context.object
    roof.name = "lantern_roof"
    roof.rotation_euler = (0, 0, math.radians(30))
    add_bevel(roof, 0.012, 3)
    add_material(roof, stone_light)
    smooth(roof, 40)
    lathe(
        "lantern_finial",
        [(0.05, 0.765), (0.035, 0.79), (0.02, 0.815), (0.032, 0.84), (0.001, 0.87)],
        (0, 0, 0),
        stone_dark,
        segments=16,
    )


def make_birdbath():
    stone = material("#C9C0AE", 0.9)
    stone_dark = material("#A69C8A", 0.92)
    basin_shade = material("#5D6A68", 0.94)
    water = material(
        "#3F6B77",
        0.24,
        metallic=0.02,
        ior=1.45,
        alpha=0.66,
        name="fountain_water",
    )
    lathe(
        "bath_base",
        [(0.18, 0.0), (0.2, 0.015), (0.18, 0.045), (0.14, 0.06)],
        (0, 0, 0),
        stone_dark,
        segments=32,
    )
    lathe(
        "bath_pedestal",
        [(0.095, 0.05), (0.11, 0.08), (0.075, 0.13), (0.065, 0.23), (0.085, 0.32), (0.11, 0.4)],
        (0, 0, 0),
        stone,
        segments=40,
        scallop=0.09,
        scallop_count=10,
    )
    lathe(
        "bath_bowl",
        [
            (0.1, 0.4),
            (0.24, 0.425),
            (0.305, 0.47),
            (0.31, 0.505),
            (0.285, 0.525),
            (0.255, 0.515),
            (0.225, 0.487),
            (0.105, 0.465),
        ],
        (0, 0, 0),
        stone,
        segments=48,
        cap_bottom=True,
        cap_top=False,
    )
    cylinder("bath_floor", 0.25, 0.012, (0, 0, 0.478), basin_shade, vertices=40, bevel=0.003)
    rings = 16
    segments = 48
    radius = 0.265
    verts = [(0.0, 0.0, 0.5)]
    for ring in range(1, rings + 1):
        ring_radius = radius * ring / rings
        for segment in range(segments):
            angle = math.tau * segment / segments
            verts.append(
                (
                    math.cos(angle) * ring_radius,
                    math.sin(angle) * ring_radius,
                    0.5 + 0.0003 * math.cos(ring_radius * 22.0),
                )
            )
    faces = []
    for segment in range(segments):
        faces.append((0, 1 + segment, 1 + (segment + 1) % segments))
    for ring in range(rings - 1):
        inner = 1 + ring * segments
        outer = inner + segments
        for segment in range(segments):
            nxt = (segment + 1) % segments
            faces.append((inner + segment, inner + nxt, outer + nxt, outer + segment))
    mesh = bpy.data.meshes.new("bath_water")
    mesh.from_pydata(verts, [], faces)
    mesh.validate()
    surface = bpy.data.objects.new("bath_water", mesh)
    bpy.context.collection.objects.link(surface)
    add_material(surface, water)
    smooth(surface, full=True)


def make_balustrade():
    stone = material("#D0C6B4", 0.9)
    stone_light = material("#E0D8C8", 0.88)
    stone_dark = material("#AFA592", 0.92)
    cube("rail_bottom", (0.9, 0.115, 0.06), (0, 0, 0.03), stone_dark, bevel=0.018, segments=3)
    cube("rail_top", (0.92, 0.135, 0.07), (0, 0, 0.435), stone_light, bevel=0.022, segments=3)
    profile = [
        (0.0675, 0.0),
        (0.054, 0.02),
        (0.0315, 0.09),
        (0.027, 0.16),
        (0.0432, 0.22),
        (0.0648, 0.27),
        (0.0702, 0.305),
        (0.0378, 0.335),
    ]
    for index, x in enumerate((-0.3, 0.0, 0.3)):
        lathe(
            f"baluster_{index}",
            profile,
            (x, 0, 0.055),
            stone,
            segments=24,
            cap_bottom=True,
            cap_top=True,
            angle=36,
        )
        cube(
            f"baluster_plinth_{index}",
            (0.15, 0.118, 0.035),
            (x, 0, 0.072),
            stone_dark,
            bevel=0.008,
            segments=2,
        )
    for index, x in enumerate((-0.39, 0.39)):
        ico(
            f"rail_end_{index}",
            0.055,
            (x, 0, 0.47),
            stone_light,
            subdivisions=2,
            scale=(0.9, 0.95, 0.8),
            seed=90 + index,
        )


def make_firepot():
    puff_stone = material("#E8E2D6", 0.88)
    terracotta = material("#B27056", 0.86)
    rim = material("#8A523F", 0.88)
    coal = material("#FFB24A", 0.5, emission="#FF9A2E", strength=2.2)
    for index, (x, y, radius) in enumerate(
        ((-0.08, 0.05, 0.115), (0.09, 0.07, 0.1), (0.02, -0.09, 0.105), (0.0, 0.02, 0.085))
    ):
        ico(
            f"stone_puff_{index}",
            radius,
            (x, y, radius * 0.78),
            puff_stone,
            subdivisions=2,
            scale=(1.25, 1.05, 0.8),
            jitter=0.006,
            seed=100 + index,
        )
    lathe(
        "firepot_body",
        [(0.1, 0.05), (0.17, 0.075), (0.225, 0.14), (0.245, 0.21), (0.225, 0.275), (0.19, 0.315)],
        (0, 0, 0),
        terracotta,
        segments=32,
    )
    torus("firepot_rim", 0.19, 0.022, (0, 0, 0.318), rim, major_segments=32, minor_segments=8)
    cylinder("firepot_coals", 0.185, 0.025, (0, 0, 0.306), material("#5B4B42", 0.9), vertices=24, bevel=0.004)
    for index in range(5):
        angle_value = (index / 5.0) * math.tau
        ico(
            f"coal_{index}",
            0.03,
            (math.cos(angle_value) * 0.09, math.sin(angle_value) * 0.09, 0.33),
            coal,
            subdivisions=1,
            jitter=0.004,
            seed=110 + index,
        )
    flame("flame_center", (0.0, 0.0, 0.325), 0.22, 0.07, 121)
    flame("flame_left", (-0.075, 0.03, 0.325), 0.16, 0.05, 122)
    flame("flame_right", (0.07, 0.045, 0.325), 0.14, 0.045, 123)
    flame("flame_back", (0.02, -0.07, 0.325), 0.12, 0.04, 124)


def make_rose_planter():
    terracotta = material("#668280", 0.35)
    terracotta_light = material("#849E9C", 0.35)
    soil = material("#886546", 0.95)
    leaf = material("#5F7D45", 0.88)
    leaf_dark = material("#496236", 0.9)
    crimson = material("#A04250", 0.82)
    crimson_dark = material("#7A2D3A", 0.84)
    pink = material("#C67D8B", 0.84)
    lathe(
        "planter_pot",
        [(0.13, 0.0), (0.17, 0.02), (0.205, 0.1), (0.225, 0.22), (0.21, 0.275), (0.235, 0.295), (0.235, 0.33)],
        (0, 0, 0),
        terracotta,
        segments=32,
    )
    torus("planter_rim", 0.225, 0.024, (0, 0, 0.322), terracotta_light, major_segments=32, minor_segments=8)
    cylinder("planter_soil", 0.21, 0.03, (0, 0, 0.327), soil, vertices=28, bevel=0.004)
    blooms = [
        (-0.13, -0.07, 0.53, 0.058, crimson),
        (0.02, 0.08, 0.58, 0.062, crimson_dark),
        (0.14, -0.05, 0.5, 0.055, pink),
        (-0.02, -0.14, 0.47, 0.05, crimson),
        (0.1, 0.13, 0.44, 0.048, crimson_dark),
    ]
    for index, (x, y, z, size, bloom_mat) in enumerate(blooms):
        stem_start = (-0.01, 0.01, 0.34)
        stem_mid = (x * 0.35, y * 0.35, z - 0.12)
        stem_end = (x, y, z + 0.005)
        tube(
            f"rose_stem_{index}",
            [stem_start, stem_mid, stem_end],
            0.008,
            leaf_dark,
            radii=[1.0, 0.75, 0.45],
            resolution=10,
        )
        stem_angle = math.atan2(y, x)
        leaf_specs = (
            (stem_start, stem_mid, 0.62, 0.85, 0.030, leaf_dark),
            (stem_mid, stem_end, 0.38, -0.95, 0.026, leaf),
        )
        for leaf_index, (a, b, t, angle_offset, leaf_size, leaf_mat) in enumerate(leaf_specs):
            lx = a[0] + (b[0] - a[0]) * t
            ly = a[1] + (b[1] - a[1]) * t
            lz = a[2] + (b[2] - a[2]) * t
            leaf_angle = stem_angle + angle_offset
            ico(
                f"rose_leaf_{index}_{leaf_index}",
                leaf_size,
                (
                    lx + math.cos(leaf_angle) * 0.014,
                    ly + math.sin(leaf_angle) * 0.014,
                    lz,
                ),
                leaf_mat,
                subdivisions=1,
                scale=(1.45, 0.62, 0.3),
                rotation=(math.radians(-12), 0, leaf_angle),
                seed=130 + index * 2 + leaf_index,
            )
        rose_bloom((x, y, z), size, bloom_mat, crimson_dark if bloom_mat != crimson_dark else crimson, 140 + index)


def make_blossom_tree(palette=None, sturdy_trunk=False, trunk_color=None, trunk_light_color=None):
    trunk_mat = material(trunk_color or "#916846", 0.9)
    trunk_light = material(trunk_light_color or "#AA7E56", 0.9)
    if palette is None:
        palette = [
            ("#FFABC5", 0.86),
            ("#FF8BB7", 0.88),
            ("#FFBCDE", 0.85),
            ("#F695BA", 0.88),
        ]
    shades = [material(color, roughness) for color, roughness in palette]
    if sturdy_trunk:
        tube(
            "tree_trunk",
            [(0, 0, 0), (0.015, 0.005, 0.20), (-0.005, 0.01, 0.42), (0.01, 0.0, 0.62), (0.0, 0.0, 0.80)],
            0.06375,
            trunk_mat,
            radii=[1.55, 1.35, 1.15, 0.98, 0.78],
            resolution=18,
        )
    else:
        tube(
            "tree_trunk",
            [(0, 0, 0), (0.02, 0.01, 0.18), (-0.03, 0.02, 0.36), (0.02, 0.0, 0.52), (0.0, 0.0, 0.72)],
            0.055,
            trunk_mat,
            radii=[1.6, 1.35, 1.1, 0.9, 0.7],
            resolution=16,
        )
    if sturdy_trunk:
        tube(
            "tree_branch_left",
            [(0.0, 0.0, 0.46), (-0.10, 0.015, 0.55), (-0.20, 0.02, 0.62)],
            0.04,
            trunk_light,
            radii=[1.15, 0.9, 0.65],
            resolution=10,
        )
        tube(
            "tree_branch_right",
            [(0.0, 0.0, 0.52), (0.12, -0.01, 0.61), (0.23, 0.01, 0.68)],
            0.038,
            trunk_light,
            radii=[1.15, 0.9, 0.65],
            resolution=10,
        )
        blossom_cluster((0.02, 0.0, 0.90), 0.27, [shades[0]], 151)
        blossom_cluster((-0.20, 0.02, 0.70), 0.18, [shades[1]], 152)
        blossom_cluster((0.23, 0.01, 0.76), 0.20, [shades[2]], 153)
    else:
        tube(
            "tree_branch_left",
            [(0.01, 0.0, 0.46), (-0.13, 0.03, 0.56), (-0.24, 0.0, 0.7)],
            0.03,
            trunk_light,
            radii=[1.1, 0.85, 0.55],
            resolution=12,
        )
        tube(
            "tree_branch_right",
            [(0.0, 0.0, 0.5), (0.14, -0.03, 0.6), (0.25, 0.02, 0.74)],
            0.03,
            trunk_light,
            radii=[1.1, 0.85, 0.55],
            resolution=12,
        )
        tube(
            "tree_branch_back",
            [(0.0, 0.0, 0.44), (0.02, 0.12, 0.58), (0.0, 0.19, 0.72)],
            0.025,
            trunk_mat,
            radii=[1.0, 0.8, 0.5],
            resolution=12,
        )
        blossom_cluster((0.0, 0.0, 0.80), 0.18, shades, 150)
        blossom_cluster((0.0, 0.0, 0.88), 0.29, shades, 151)
        blossom_cluster((-0.22, 0.02, 0.78), 0.2, shades, 152)
        blossom_cluster((0.23, 0.03, 0.8), 0.21, shades, 153)
        blossom_cluster((0.0, 0.17, 0.78), 0.19, shades, 154)
    rng = random.Random(155)
    for index in range(8):
        angle_value = rng.uniform(0, math.tau)
        distance = rng.uniform(0.16, 0.38)
        ico(
            f"fallen_petal_{index}",
            0.024,
            (math.cos(angle_value) * distance, math.sin(angle_value) * distance, 0.008),
            shades[index % len(shades)],
            subdivisions=1,
            scale=(1.5, 0.9, 0.25),
            rotation=(0, 0, angle_value),
            seed=160 + index,
        )
    if not sturdy_trunk:
        for index in range(4):
            angle_value = (index / 4.0) * math.tau + 0.4
            tube(
                f"tree_root_{index}",
                [(0.0, 0.0, 0.06), (math.cos(angle_value) * 0.07, math.sin(angle_value) * 0.07, 0.02), (math.cos(angle_value) * 0.11, math.sin(angle_value) * 0.11, 0.0)],
                0.018,
                trunk_mat,
                radii=[1.2, 0.8, 0.35],
                resolution=8,
            )


def make_market_stall(awning_color="#EB8551"):
    timber = material("#6B4A32", 0.88)
    timber_light = material("#8A6244", 0.88)
    counter_top = material("#A9774C", 0.86)
    cream = material("#F1E7D2", 0.9)
    terracotta = material(awning_color, 0.88)
    produce_colors = [
        material("#D9774F", 0.8),
        material("#E3B04B", 0.8),
        material("#8DA35D", 0.8),
    ]
    cube("stall_counter", (0.82, 0.3, 0.3), (0, -0.1, 0.23), timber, bevel=0.02, segments=3)
    cube("stall_counter_top", (0.86, 0.33, 0.04), (0, -0.1, 0.4), counter_top, bevel=0.012, segments=3)
    post_profile = [
        (0.045, 0.0),
        (0.036, 0.05),
        (0.05, 0.16),
        (0.036, 0.3),
        (0.046, 0.45),
        (0.034, 0.62),
        (0.044, 0.76),
        (0.034, 0.9),
    ]
    for x in (-0.35, 0.35):
        for y in (-0.28, 0.28):
            lathe(
                "stall_post",
                post_profile,
                (x, y, 0.0),
                timber_light,
                segments=12,
                cap_bottom=True,
                cap_top=True,
                angle=36,
            )
    striped = [cream, terracotta]
    for index in range(6):
        color = striped[index % 2]
        x = -0.375 + index * 0.15
        cube(
            f"awning_stripe_{index}",
            (0.15, 0.66, 0.018),
            (x, 0.0, 0.925),
            color,
            bevel=0.008,
            segments=2,
            rotation=(math.radians(-7), 0, 0),
            angle=45,
        )
        ico(
            f"awning_scallop_{index}",
            0.06,
            (x, -0.335, 0.86),
            color,
            subdivisions=2,
            scale=(1.1, 0.28, 0.72),
            jitter=0.002,
            seed=170 + index,
        )
    for index, (x, y) in enumerate(((-0.2, -0.09), (0.18, -0.06))):
        crate_x, crate_y = x, y
        for side in (-1, 1):
            cube(
                f"crate_side_{index}_{side}",
                (0.22, 0.012, 0.08),
                (crate_x, crate_y + side * 0.08, 0.465),
                timber_light,
                bevel=0.004,
                segments=2,
                angle=45,
            )
            cube(
                f"crate_end_{index}_{side}",
                (0.012, 0.17, 0.08),
                (crate_x + side * 0.105, crate_y, 0.465),
                timber_light,
                bevel=0.004,
                segments=2,
                angle=45,
            )
        cube(
            f"crate_bottom_{index}",
            (0.22, 0.17, 0.012),
            (crate_x, crate_y, 0.425),
            timber_light,
            bevel=0.003,
            segments=2,
            angle=45,
        )
        for produce_index in range(5):
            angle_value = (produce_index / 5.0) * math.tau
            ico(
                f"produce_{index}_{produce_index}",
                0.035,
                (
                    crate_x + math.cos(angle_value) * 0.055,
                    crate_y + math.sin(angle_value) * 0.045,
                    0.48,
                ),
                produce_colors[produce_index % 3],
                subdivisions=1,
                jitter=0.002,
                seed=180 + index * 10 + produce_index,
            )
    cube("stall_valance_left", (0.02, 0.64, 0.08), (-0.46, 0.0, 0.9), terracotta, bevel=0.006, segments=2)
    cube("stall_valance_right", (0.02, 0.64, 0.08), (0.46, 0.0, 0.9), cream, bevel=0.006, segments=2)


def make_wooden_bench():
    wood = material("#A06B3B", 0.86)
    wood_light = material("#B88249", 0.86)
    wood_dark = material("#6B4829", 0.88)
    iron = material("#6F6A62", 0.75, metallic=0.25)
    for index, y in enumerate((-0.1, 0.0, 0.1)):
        cube(
            f"bench_seat_{index}",
            (0.78, 0.125, 0.045),
            (0, y, 0.32),
            wood_light if index % 2 else wood,
            bevel=0.014,
            segments=3,
            angle=38,
        )
    for index, z in enumerate((0.46, 0.58)):
        cube(
            f"bench_back_{index}",
            (0.78, 0.045, 0.105),
            (0, 0.165, z),
            wood if index else wood_light,
            bevel=0.012,
            segments=3,
            rotation=(math.radians(-8), 0, 0),
            angle=38,
        )
    for x in (-0.33, 0.33):
        for y in (-0.12, 0.12):
            cube(
                "bench_leg",
                (0.055, 0.055, 0.31),
                (x, y, 0.155),
                wood_dark,
                bevel=0.01,
                segments=3,
            )
    for side in (-1, 1):
        x = side * 0.385
        tube(
            f"bench_armrest_{side}",
            [(x, -0.18, 0.3), (x, -0.14, 0.41), (x, 0.02, 0.45), (x, 0.16, 0.61)],
            0.024,
            iron,
            radii=[1.0, 1.15, 1.0, 0.75],
            resolution=12,
        )
        ico(
            f"bench_arm_knob_{side}",
            0.032,
            (x, -0.18, 0.3),
            iron,
            subdivisions=2,
            seed=190 + side,
        )
        cube(
            f"bench_backpost_{side}",
            (0.05, 0.05, 0.32),
            (x, 0.16, 0.47),
            wood_dark,
            bevel=0.008,
            segments=2,
            rotation=(math.radians(-8), 0, 0),
        )


def make_cottage():
    wall = material("#DFD6C5", 0.80)
    wood = material("#A58C6E", 0.80)
    window_wood = material("#9C6F4C", 0.80)
    casing_wood = material("#9A6C4C", 0.80)
    door_panel = material("#7E5C3B", 0.82)
    groove = material("#654A30", 0.85)
    brass = material("#E6B84C", 0.35, metallic=0.7)
    roof = material("#A55C45", 0.85)
    roof_dark = material("#9D5640", 0.85)
    roof_light = material("#AD6349", 0.85)
    eave = material("#8B4637", 0.85)
    pane = material("#FFF6DB", 0.4, emission="#FFF6DB", strength=4.0)

    wall_height = 0.613
    cube("cottage_body", (0.86, 0.74, wall_height), (0, 0, wall_height / 2), wall, bevel=0.025, segments=4)

    pitch = math.radians(38)
    run = 0.49
    rise = run * math.tan(pitch)
    peak_z = wall_height + rise
    panel_len = math.sqrt(run ** 2 + rise ** 2)
    panel_z = wall_height + rise / 2

    # Gable walls and broad 35-degree roof.
    def gable(y0, y1):
        verts = [
            (-0.43, y0, wall_height), (0.43, y0, wall_height), (0.0, y0, peak_z),
            (-0.43, y1, wall_height), (0.43, y1, wall_height), (0.0, y1, peak_z),
        ]
        faces = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
        mesh = bpy.data.meshes.new("cottage_gable")
        mesh.from_pydata(verts, [], faces)
        mesh.validate()
        obj = bpy.data.objects.new("cottage_gable", mesh)
        bpy.context.collection.objects.link(obj)
        add_material(obj, wall)
        add_bevel(obj, 0.012, 2)
        smooth(obj, 40)
        return obj

    gable(-0.37, -0.355)
    gable(0.355, 0.37)

    shingle_colors = [roof, roof_dark, roof_light]
    for side in (-1, 1):
        center_x = side * run / 2
        rotation_y = side * pitch
        cube(
            f"cottage_roof_{side}",
            (panel_len + 0.05, 0.94, 0.066),
            (center_x, 0.0, panel_z),
            roof,
            bevel=0.016,
            segments=3,
            rotation=(0, rotation_y, 0),
            angle=40,
        )
        for row in range(5):
            local_x = -0.22 + row * 0.11
            local_z = 0.052 + row * 0.002
            world_x = center_x + local_x * math.cos(rotation_y) + local_z * math.sin(rotation_y)
            world_z = panel_z - local_x * math.sin(rotation_y) + local_z * math.cos(rotation_y)
            for column in range(4):
                local_y = -0.315 + column * 0.21 + (0.05 if row % 2 else 0.0)
                rng = random.Random(1000 + (1 if side > 0 else 0) * 100 + row * 10 + column)
                jitter = math.radians(rng.uniform(-1.5, 1.5))
                thickness = 0.049 + rng.uniform(-0.003, 0.003)
                cube(
                    f"cottage_shingle_{side}_{row}_{column}",
                    (0.115, 0.195, thickness),
                    (world_x, local_y, world_z),
                    shingle_colors[(row + column) % 3],
                    bevel=0.012,
                    segments=2,
                    rotation=(0, side * (pitch + 0.04) + jitter, 0),
                    angle=45,
                )

    cube("cottage_ridge", (0.17, 1.02, 0.082), (0, 0, peak_z + 0.016), roof, bevel=0.018, segments=3)

    # Clean corner beams straight to the ground.
    beam_height = wall_height + 0.02
    for x in (-0.40, 0.40):
        for y in (-0.34, 0.34):
            cube(
                f"cottage_corner_{x}_{y}",
                (0.065, 0.065, beam_height),
                (x, y, beam_height / 2),
                wood,
                bevel=0.01,
                segments=2,
            )

    # Recessed plank door with subtle grooves and a cross-brace.
    cube("cottage_door", (0.194, 0.036, 0.264), (0, -0.360, 0.132), door_panel, bevel=0.012, segments=3)
    cylinder("cottage_door_arch", 0.096, 0.036, (0, -0.360, 0.264), door_panel, vertices=24, bevel=0.004, rotation=(math.radians(90), 0, 0))
    ico("cottage_door_knob", 0.016, (0.06, -0.386, 0.175), brass, subdivisions=2, seed=205)

    # Smooth continuous wooden doorway surround.
    frame_radius = 0.129
    surround_points = [(-frame_radius, -0.40, 0.0)]
    surround_radii = [1.0]
    rng = random.Random(2300)
    for index in range(9):
        angle = math.pi - math.pi * index / 8
        if 0 < index < 8:
            angle += math.radians(rng.uniform(-1.5, 1.5))
        point_radius = frame_radius + rng.uniform(-0.0018, 0.0018)
        surround_points.append(
            (
                math.cos(angle) * point_radius,
                -0.40 + rng.uniform(-0.0008, 0.0008),
                0.264 + math.sin(angle) * point_radius,
            )
        )
        surround_radii.append(1.0 + rng.uniform(-0.03, 0.03))
    surround_points.append((frame_radius, -0.40, 0.0))
    surround_radii.append(1.0)
    cube("cottage_door_threshold", (0.26, 0.06, 0.035), (0, -0.39, 0.0175), casing_wood, bevel=0.006, segments=2)
    tube("cottage_door_surround", surround_points, 0.032, casing_wood, radii=surround_radii, resolution=14)

    # Circular gable window with thick mullions that meet the frame.
    gable_window_z = 0.65
    cylinder("cottage_gable_window_pane", 0.0996, 0.014, (0, -0.375, gable_window_z), pane, vertices=28, bevel=0.003, rotation=(math.radians(90), 0, 0))
    torus("cottage_gable_window_frame", 0.1188, 0.0289, (0, -0.375, gable_window_z), window_wood, rotation=(math.radians(90), 0, 0), major_segments=28, minor_segments=6)
    cube("cottage_gable_window_mullion_h", (0.188, 0.0374, 0.0374), (0, -0.384, gable_window_z), window_wood, bevel=0.005, segments=2)
    cube("cottage_gable_window_mullion_v", (0.0374, 0.0374, 0.188), (0, -0.384, gable_window_z), window_wood, bevel=0.005, segments=2)

    # Matching slightly-open rectangular windows on both side walls.
    window_center = 0.35
    for side in (-1, 1):
        x = side * 0.432
        pane_x = side * 0.441
        sill_x = side * 0.446
        cube(f"cottage_window_pane_{side}", (0.014, 0.22, 0.144), (pane_x, 0, window_center), pane, bevel=0.003, segments=2)
        cube(f"cottage_window_sill_{side}", (0.05, 0.30, 0.035), (sill_x, 0, window_center - 0.095), window_wood, bevel=0.006, segments=2)
        for z in (window_center + 0.083, window_center - 0.083):
            cube(f"cottage_window_frame_{side}_{z}", (0.024, 0.26, 0.03), (side * 0.438, 0, z), window_wood, bevel=0.006, segments=2)
        for y in (-0.125, 0.125):
            cube(f"cottage_window_side_{side}_{y}", (0.024, 0.03, 0.171), (side * 0.438, y, window_center), window_wood, bevel=0.006, segments=2)
        angles = (120.0, 120.0) if side < 0 else (60.0, 50.0)
        shutter_width = 0.105
        for edge_y, direction, degrees in ((-0.11, 1, angles[0]), (0.11, -1, angles[1])):
            phi = math.radians(degrees)
            center_y = edge_y + direction * (shutter_width / 2) * math.cos(phi)
            center_x = side * (0.448 + (shutter_width / 2) * math.sin(phi))
            cube(
                f"cottage_shutter_{side}_{edge_y}",
                (0.022, shutter_width, 0.18),
                (center_x, center_y, window_center),
                window_wood,
                bevel=0.006,
                segments=2,
                rotation=(0, 0, -side * direction * phi),
                angle=40,
            )

def make_leafy_tree():
    make_blossom_tree(
        [
            ("#7A8E4D", 0.85),
            ("#5A6D36", 0.85),
            ("#495A2F", 0.85),
        ],
        sturdy_trunk=True,
        trunk_color="#8E6943",
        trunk_light_color="#8E6943",
    )


def make_blue_market_stall():
    make_market_stall("#5B9BD5")


BUILDERS = {
    "sandstone_tile": (make_sandstone, True),
    "slate_tile": (make_slate, True),
    "grass_tile": (make_grass, True),
    "water_basin": (make_water_basin, True),
    "stone_stairs": (make_stone_stairs, True),
    "stone_lantern": (make_stone_lantern, False),
    "birdbath_fountain": (make_birdbath, False),
    "balustrade": (make_balustrade, False),
    "firepot": (make_firepot, False),
    "rose_planter": (make_rose_planter, False),
    "blossom_tree": (make_blossom_tree, False),
    "leafy_tree": (make_leafy_tree, False),
    "cottage": (make_cottage, False),
    "market_stall": (make_market_stall, False),
    "blue_market_stall": (make_blue_market_stall, False),
    "wooden_bench": (make_wooden_bench, False),
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for dataset in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.node_groups,
    ):
        for block in list(dataset):
            if block.users == 0:
                dataset.remove(block)
    MATERIALS.clear()


def bounds(mesh):
    xs = [vertex.co.x for vertex in mesh.vertices]
    ys = [vertex.co.y for vertex in mesh.vertices]
    zs = [vertex.co.z for vertex in mesh.vertices]
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def finalize(name, is_base):
    meshes = [obj for obj in bpy.context.scene.objects if obj.type in {"MESH", "CURVE"}]
    if not meshes:
        raise RuntimeError(f"{name}: no geometry created")
    for obj in list(meshes):
        select_only(obj)
        bpy.ops.object.convert(target="MESH")
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    active = meshes[0]
    bpy.context.view_layer.objects.active = active
    bpy.ops.object.join()
    model = bpy.context.object
    model.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh = model.data
    min_x, max_x, min_y, max_y, min_z, _ = bounds(mesh)
    offset = Vector((-(min_x + max_x) / 2.0, -(min_y + max_y) / 2.0, -min_z))
    for vertex in mesh.vertices:
        vertex.co += offset
    mesh.update()

    min_x, max_x, min_y, max_y, min_z, max_z = bounds(mesh)
    size_x = max_x - min_x
    size_y = max_y - min_y
    size_z = max_z - min_z

    if is_base:
        scale_x = 1.0 / max(size_x, 1e-6)
        scale_y = 1.0 / max(size_y, 1e-6)
        scale_z = BASE_HEIGHT / max(size_z, 1e-6)
        for vertex in mesh.vertices:
            vertex.co.x *= scale_x
            vertex.co.y *= scale_y
            vertex.co.z *= scale_z
    else:
        footprint = max(size_x, size_y)
        if footprint > 0.92:
            factor = 0.92 / footprint
            for vertex in mesh.vertices:
                vertex.co *= factor
        slim = MODEL_SLIM.get(name, 1.0)
        if slim != 1.0:
            for vertex in mesh.vertices:
                vertex.co.x *= slim
                vertex.co.y *= slim
    mesh.update()

    min_x, max_x, min_y, max_y, min_z, max_z = bounds(mesh)
    for vertex in mesh.vertices:
        vertex.co.x -= (min_x + max_x) / 2.0
        vertex.co.y -= (min_y + max_y) / 2.0
        vertex.co.z -= min_z
    stretch = MODEL_STRETCH.get(name, 1.0)
    if stretch != 1.0:
        for vertex in mesh.vertices:
            vertex.co.z *= stretch
    mesh.update()

    model.location = (0, 0, 0)
    model.rotation_euler = (0, 0, 0)
    model.scale = (1, 1, 1)
    min_x, max_x, min_y, max_y, min_z, max_z = bounds(mesh)
    width = max_x - min_x
    depth = max_y - min_y
    height = max_z - min_z
    if is_base:
        if abs(width - 1.0) > 0.01 or abs(depth - 1.0) > 0.01 or abs(height - BASE_HEIGHT) > 0.01:
            raise RuntimeError(f"{name}: base bounds {width:.4f} x {depth:.4f} x {height:.4f}")
    else:
        if width > 0.925 or depth > 0.925:
            raise RuntimeError(f"{name}: prop footprint {width:.4f} x {depth:.4f}")
    print(f"  {name}: {width:.3f} x {depth:.3f} x {height:.3f}")
    return model


def export_model(model, name):
    filepath = os.path.join(OUT_DIR, f"{name}.glb")
    select_only(model)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_yup=True,
        export_materials="EXPORT",
        export_texcoords=False,
    )
    size = os.path.getsize(filepath)
    print(f"  wrote {name}.glb ({size / 1024:.1f} KB)")


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    print(f"Blender {bpy.app.version_string}: generating {len(BUILDERS)} sculpted GLB models")
    random.seed(13)
    for name, (builder, is_base) in BUILDERS.items():
        clear_scene()
        builder()
        model = finalize(name, is_base)
        export_model(model, name)
    clear_scene()
    missing = [name for name in BUILDERS if not os.path.exists(os.path.join(OUT_DIR, f"{name}.glb"))]
    if missing:
        raise RuntimeError(f"Missing exports: {missing}")
    print(f"Verified {len(BUILDERS)} GLB files in {OUT_DIR}")


main()
