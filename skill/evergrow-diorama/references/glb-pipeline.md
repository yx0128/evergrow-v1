# GLB pipeline

## Coordinate contract

| Concern | Blender | glTF / Three.js |
| --- | --- | --- |
| Up | `+Z` | `+Y` (`export_yup=True`) |
| Ground | `Z=0` | `y=0` |
| Base tile | `1.0 × 1.0 × 0.35` | normalized to `0.96 × 0.35 × 0.96` |
| Prop footprint | `≤0.92 × 0.92` | normalized to `0.96` max horizontal |
| Origin | centered X/Z, grounded | centered, grounded |

## Script shape

```python
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
  "market_stall": (make_market_stall, False),
  "wooden_bench": (make_wooden_bench, False),
}
```

Helpers:

- `cube()` — primitive + applied scale + bevel modifier + auto smooth.
- `cylinder()` — beveled lathe-like primitive.
- `lathe(profile, segments, scallop)` — custom ring/quad mesh with recalculated normals.
- `ico(radius, jitter)` — organic puffs and petals.
- `torus()` — rings, rims, ripples.
- `tube(points, radii)` — bezier curve converted to mesh.
- `grass_field()` — one mesh with 25 tapered curved blades and material indices.

## Finalize

1. Convert all meshes/curves; apply modifiers.
2. Join to one mesh; apply transforms.
3. Center X/Z, ground Z=0.
4. Base: scale X/Y to `1.0`, Z to `0.35`.
5. Prop: uniform-scale down if footprint > `0.92`.
6. Re-center/ground; assert dimensions; export.

## Materials

- `srgb(hex)` → linear RGB.
- Principled BSDF: `Base Color`, `Roughness`, `Metallic`, `IOR`, `Alpha`, `Transmission Weight`, `Emission Color`, `Emission Strength`.
- Stone/clay roughness `0.86–0.92`; wood `0.82–0.88`.
- Water: roughness `0.08`, transmission `0.55–0.60`, IOR `1.33`, alpha `0.82`.
- Lantern core / flames: emission strength `4.0`; coals `2.2`.
- No textures; variation is geometry + material color.

## Export

```python
bpy.ops.export_scene.gltf(
    filepath=path,
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
```

`export_apply=True` is mandatory for bevels/subdivision/smooth-by-angle.

## Runtime normalization

```ts
const scale = 0.96 / Math.max(size.x, size.z, 0.0001);
const verticalScale =
  item.category === 'base' ? 0.35 / Math.max(size.y, 0.0001) : scale;
const offset = [-center.x * scale, -box.min.y * verticalScale, -center.z * scale];
```

Base tiles are authored at `0.35` tall. The horizontal normalization shrinks them to `0.96` wide; the vertical lock keeps their top exactly at `0.35` so props do not float.

## Verification

- 13 non-zero GLBs.
- Base tiles print `1.000 × 1.000 × 0.350`.
- Props print footprint `≤0.925`.
- App loads with no placeholder labels.
- Night lantern/flame emission blooms.
- Props sit flush; no z-fighting.

## Pitfalls

| Symptom | Fix |
| --- | --- |
| KeyError on sockets | Blender 5 names: `Emission Color`, `Emission Strength`, `Transmission Weight`. |
| Bevels missing in browser | `export_apply=True`. |
| Model on its side | `export_yup=True`. |
| Prop floats | Base height lock or loader vertical scale. |
| Huge GLB | Unjoined parts / duplicated materials. |
| Faceted look | Auto-smooth angle or bevel segments too low. |
| `finalize` assertion | Footprint or height drifted; inspect printed dimensions. |
