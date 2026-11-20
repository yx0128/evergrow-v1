# Agent guide

Use this when you are picking the repository up cold. It is deliberately short; [REPRODUCTION.md](REPRODUCTION.md) explains how to rebuild it, and [ARCHITECTURE.md](ARCHITECTURE.md) explains why it works.

## First 5 minutes

```bash
node --version        # 20+
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Open the app at `1440×900`. You should see a floating courtyard, a task drawer on the right, and a hotbar at the bottom. If a prop is missing, a labeled beveled block appears — check `public/models/` and the browser console.

## Mental model

- `src/data/items.ts` defines the economy and catalog.
- `src/store/useWorldStore.ts` owns all persisted state and validation.
- `src/components/canvas/MiniatureModel.tsx` turns any GLB into a normalized, grounded, shadow-casting miniature.
- `src/components/canvas/Diorama.tsx` owns placement, selection, moving, ghosting, picking up, and the invisible raycast plane.
- `src/components/canvas/InstancedItemBatch.tsx` renders placed items through per-material `InstancedMesh` batches.
- `src/components/canvas/LightingPool.tsx` owns the fixed six point lights.
- `src/components/canvas/Effects.tsx` is the lazy post-processing entry point.
- `src/components/canvas/Scene.tsx` owns camera, lights, post-processing, and day/night.
- `src/App.tsx` owns keyboard shortcuts, toasts, feedback sounds, and HUD composition.
- `scripts/generate_models.py` is the source of truth for the committed GLBs.

## Invariants to protect

1. Base tiles are exactly `0.35` tall in world space; props sit at `y=0.35`.
2. `placedItems` has at most one base and one prop per cell; props require a base. Selecting a piece does not move it; rotating a selected base rotates its prop; moving a base moves its prop.
3. Task completion pays once and is one-way.
4. Persisted data is untrusted; extend the sanitizer with every new field.
5. Never persist transient UI state.
6. Never commit tokens, `dist/`, `node_modules/`, or Blender backups.
7. Left click builds, right drag orbits, middle drag pans.
8. The design palette is cream/sand/sage/terracotta/rose/gold/slate only.

## Common tasks

**Add or change a prop**

1. Add a `make_*` builder and `BUILDERS` entry in `scripts/generate_models.py`.
2. Run `npm run models` (Blender required) and confirm the printed dimensions.
3. Add/update the item in `src/data/items.ts`.
4. Add a store test if the item changes layer/light behavior.
5. Run all gates and take a fresh screenshot.

**Performance review**

Keep the light count at six, keep placed items instanced, and keep `Effects.tsx` behind the lazy High-quality gate. The QA script should report zero console errors and the Low preset must not request the `postprocessing` chunk.

**Fix a move bug**

`selectPiece` sets `selectedPieceId` without changing placement. `rotate()` rotates a selected piece in place, updates `movingRotation` while lifted, or rotates the build ghost. `beginMove` (from Move/`M`) clears selection and seeds `movingRotation`. `moveTo` validates against the board minus the moving group and persists new coordinates and rotation without touching stock. The canvas hides the moving pieces and renders one or two ghosts. Keep failure non-destructive so the player can retry.

**Change the shop economy**

Edit `TASK_REWARDS` and item `cost` values. Update the README catalog and tests. Do not change the starter coins without updating the default-world test.

**Fix a placement bug**

Reproduce with a seeded save, inspect `placedItems` in `localStorage`, then trace `placeAt` / `removeItem` in the store before touching the canvas. The store is easier to test.

**Change the camera**

Edit `DAY_CAMERA` and `CAMERA_TARGET` in `src/components/canvas/Scene.tsx`. Keep `fov 32` and the polar clamp. Verify with the task drawer open and closed.

**Publish**

Follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md). Use one `gh auth token`, `GIT_ASKPASS`, and `credential.helper=` to avoid repeated Keychain prompts. Never commit the token.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 4183
```

Then run `docs/qa/visual-check.mjs` per [QA.md](QA.md). It seeds a rich world and asserts task payout, purchase, placement, and reload persistence, and captures the README screenshots.

## When something looks wrong

| Observation | First place to look |
| --- | --- |
| Prop floats or sinks | `MiniatureModel` vertical scale and `BASE_HEIGHT` |
| Ghost does not follow pointer | `Diorama` raycast plane and piece `stopPropagation` |
| Click places twice | Missing `stopPropagation` on the piece group |
| Night is black | Ambient/hemisphere fill, moon intensity, point lights |
| Bloom is overwhelming | Bloom intensity, not threshold |
| Model appears tiny | GLB bounding box, `FOOTPRINT`, exporter units |
| Task pays twice | `toggleTask` must reject `done` tasks |
| Save resets on reload | `partialize`, storage key/version, sanitizer |
| Preview shows another project | Explicit port; check page title |
| Push asks for credentials repeatedly | One token, askpass, disabled credential helper |

## Handoff quality bar

Leave the repository in a state where a stranger can clone it, run the app, regenerate the art, understand the contracts, verify the flows, and publish without asking you a question. If a decision is subtle, write it in `docs/ARCHITECTURE.md` or `docs/ART_PIPELINE.md` before you stop.
