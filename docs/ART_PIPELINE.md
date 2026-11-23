# Art pipeline

Evergrow ships sixteen real GLB models across eighteen catalog items (the paper lantern and pine tree are procedural). They are authored procedurally with Blender's Python API rather than exported from a modeling UI, which makes the art reproducible, reviewable, and cheap to iterate.

## Coordinate contract

| Concern | Blender | glTF / Three.js |
| --- | --- | --- |
| Up axis | `+Z` | `+Y` (`export_yup=True`) |
| Ground | `Z = 0` | `y = 0` |
| Footprint plane | `X/Y` | `X/Z` |
| Base tile size | `1.0 × 1.0 × 0.2333` | normalized to `0.96 × 0.2333 × 0.96` |
| Prop footprint | `≤ 0.92 × 0.92` | normalized to `0.96` max horizontal |
| Origin | centered on `X/Z`, grounded | centered, grounded |

`finalize()` in `scripts/generate_models.py` performs these steps after joining all parts:

1. Apply all modifiers and convert curves to meshes.
2. Join everything into one mesh (one node, one primitive per material).
3. Apply object transforms, then center vertices on X/Z and set the minimum Z to `0`.
4. Base tiles: scale X/Y to exactly `1.0` and Z to exactly `0.2333`.
5. Props: uniform-scale down if the footprint exceeds `0.92`.
6. Re-center/ground, verify dimensions, and export.

## Commands

```bash
# Blender on PATH
blender --background --python scripts/generate_models.py

# macOS app bundle (the binary is not on PATH by default)
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/generate_models.py

# Wrapper, honours BLENDER_BIN or discovers the app bundle
npm run models
```

Tested with Blender **5.3.0**. The script targets 4.2+ but uses the 5.x Principled BSDF socket names (`Emission Color`, `Emission Strength`, `Transmission Weight`, `IOR`).

The exporter settings are:

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

`export_apply=True` is required for bevels, subdivision, and the smooth-by-angle modifier to be baked into the GLB.

## Materials

All materials use Principled BSDF and are shared per model via a cache.

| Surface | Roughness | Notes |
| --- | --- | --- |
| Stone / clay | `0.86–0.92` | Matte, low metallic, flat-shaded silhouettes softened by bevels |
| Wood | `0.82–0.88` | Warm walnut / cedar tones |
| Water | `roughness 0.08` | `transmission 0.55–0.60`, `IOR 1.33`, alpha blend |
| Lantern core | `0.45` | Emission `#FFB347`, strength **4.0** |
| Flames / coals | `0.5–0.55` | Emission strength **4.0** for flames, `2.2` for coals |

Color values are converted from sRGB hex to linear before being written into the shader sockets. Emission strength is exported through `KHR_materials_emissive_strength`, so Three.js sees a material that exceeds the bloom luminance threshold of `1.1`.

No textures are used. All variation comes from geometry and material color, which keeps the GLBs small.

## Modeling techniques

- **Bevel modifiers** with hardened normals and 2–4 segments on every box, counter, crate, rail, and stair.
- **Subdivision** on organic pieces where needed.
- **bmesh vertex jitter** on foliage puffs, stone puffs, pebbles, petals, and produce.
- **Lathe/revolve profiles** for pots, pedestals, balusters, lantern posts/finials, flame tongues, and bowl shells. Optional radial scalloping creates fluted pedestals.
- **Bezier tubes** converted to mesh for twisted tree trunks/branches, roots, rose stems, and curved bench armrests.
- **Custom tapered ribbon mesh** for the 25 grass blades.
- **Layered ico-sphere petals** for multi-layer roses and scalloped awning trim.

## Model notes

| Asset | Signature details |
| --- | --- |
| `sandstone_tile.glb` | Chamfered `1×1` slab + six individually beveled pavers in warm sandstone tones. |
| `slate_tile.glb` | Cool limestone base, raised inset panel, four carved border grooves, thin crack lines. |
| `grass_tile.glb` | Soil base, turf cap, 25 tapered curved blades in four greens, seven tiny wildflowers. |
| `water_basin.glb` | Terracotta floor, twelve beveled rim bricks + corner blocks, translucent teal water, three ripple rings, two lily pads. |
| `stone_stairs.glb` | Three softly beveled sandstone steps with lighter tread caps. |
| `stone_lantern.glb` | Lathe foot/post/finial, six-bar hexagonal lattice, emissive amber core, flared pagoda roof with upturned tips. |
| `cottage.glb` | Warm stone-cream plaster walls, chunky staggered clay-terracotta shingles (#C9734E/#C26A45/#D17C57) on a broad 35-degree roof with a beveled ridge beam, chunky voussoir door surround, thick-mullion gable porthole, and open shuttered side windows. |
| `birdbath_fountain.glb` | Fluted lathe pedestal, shell bowl, water disc, ripple rings, sculpted bird (body, head, beak, tail, eyes). |
| `balustrade.glb` | Beveled rails, three turned hourglass balusters, plinths, rounded end caps. |
| `firepot.glb` | White stone puffs, bulbous terracotta pot, coals, four layered flame tongues. |
| `rose_planter.glb` | Turned terracotta pot, soil, curved stems, leaves, five multi-layered crimson/pink roses. |
| `blossom_tree.glb` | Twisted bezier trunk and three branches, eight jittered pink foliage puffs, fallen petals, roots. |
| `market_stall.glb` | Dark timber counter, four turned posts, six-stripe cream/terracotta awning, scalloped trim, open crates with produce. |
| `wooden_bench.glb` | Three beveled seat slats, two back slats, four legs, curved iron/stone armrests with knobs. |

## Runtime normalization

`MiniatureModel` measures each loaded GLB with `Box3`. Props scale uniformly to a `0.96` horizontal footprint and ground at `y=0`. Base tiles scale horizontally to `0.96` but use a separate vertical scale of `0.2333 / size.y`; Blender already authors them at `0.2333`, so the height lock preserves the exact surface where props sit. This is why props never float, even though the horizontal normalization shrinks every model to `96%` of its cell.

## Verification

After regeneration:

```bash
npm run models
ls -lh public/models
npm run dev
```

Confirm:

- all 16 files exist and are non-zero;
- base tiles print `1.000 × 1.000 × 0.233` during generation;
- props print a footprint `≤ 0.925`;
- the app loads without a placeholder block (a missing GLB shows a beveled fallback with a label);
- day and night screenshots show lantern/fire emission;
- props sit flush on base tiles with no gap or overlap.

Use `docs/qa/visual-check.mjs` for the full visual and interaction pass.

## Editing art

1. Change the relevant `make_*` function or add a `BUILDERS` entry.
2. Keep the footprint/height contract.
3. Regenerate and inspect in the app at `1440×900`.
4. Update the catalog in `src/data/items.ts` if the item set changes.
5. Re-run typecheck, lint, tests, and build.

Avoid hand-editing `.glb` binaries; the Python script is the source of truth. Do not commit `*.blend` or `*.blend1` backups.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `bpy` socket KeyError | Blender changed Principled socket names; update the strings for your version. |
| Model lies on its side | Export must have `export_yup=True`; do not rotate the object manually. |
| Prop floats | Base tile height or loader vertical scale is wrong. |
| Bevels missing in browser | `export_apply=True` was omitted. |
| Emission does not bloom | Strength below `1.1` or bloom threshold changed. |
| Huge GLB | Duplicated materials or unjoined objects; keep the material cache and join step. |
| Flat normals look faceted | Auto-smooth angle or bevel segments are too low. |

The models are original works generated for this project and are licensed with the repository under MIT.
