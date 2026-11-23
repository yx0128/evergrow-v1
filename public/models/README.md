# Models

This directory contains the 16 runtime GLB miniatures used by Evergrow. They are generated, not hand-edited.

| File | Kind | Footprint (Blender) |
| --- | --- | --- |
| `sandstone_tile.glb` | base | 1.0 × 1.0 × 0.35 |
| `slate_tile.glb` | base | 1.0 × 1.0 × 0.35 |
| `grass_tile.glb` | base | 1.0 × 1.0 × 0.35 |
| `water_basin.glb` | base | 1.0 × 1.0 × 0.35 |
| `stone_stairs.glb` | base | 1.0 × 1.0 × 0.35 |
| `stone_lantern.glb` | prop | 0.535 × 0.616 × 0.870 |
| `birdbath_fountain.glb` | prop | 0.697 × 0.620 × 0.675 |
| `balustrade.glb` | prop | 0.920 × 0.170 × 0.514 |
| `firepot.glb` | prop | 0.490 × 0.490 × 0.550 |
| `rose_planter.glb` | prop | 0.498 × 0.498 × 0.600 |
| `blossom_tree.glb` | prop | 0.888 × 0.667 × 1.106 |
| `market_stall.glb` | prop | 0.920 × 0.669 × 0.953 |
| `wooden_bench.glb` | prop | 0.831 × 0.418 × 0.634 |

## Regenerate

```bash
npm run models
# or
blender --background --python scripts/generate_models.py
```

The script joins each model into a single mesh, applies all modifiers, centers it on X/Z, grounds it at Z=0, and exports with `export_apply=True` and `export_yup=True`.

## Runtime contract

- Horizontal normalization target: `0.96` world units.
- Base tiles are height-locked to exactly `0.35` world units after normalization.
- Props sit at `y = 0.35` on top of a base tile.
- Lantern and firepot point lights are added at runtime, not baked into the GLB.

Do not edit these files directly. Update `scripts/generate_models.py`, regenerate, and commit both the script and the GLBs. See [docs/ART_PIPELINE.md](../docs/ART_PIPELINE.md).
