# Architecture

Moss & Ember is a client-only Vite application. There is no server, account system, telemetry, or network dependency at runtime. The whole experience is a React tree wrapped around a single Three.js canvas, with Zustand as the authoritative world state and `localStorage` as the only persistence layer.

## Runtime layers

```text
App.tsx
├── WorldCanvas (Canvas + Suspense)
│   └── Scene
│       ├── CameraRig (OrbitControls, fov 32)
│       ├── Lights (day/night directional + ambient + hemisphere)
│       ├── Diorama
│       │   ├── placed items → InstancedItemBatch (per item type)
│       │   ├── ghost preview → MiniatureModel (ghost)
│       │   └── invisible raycast plane (both layers)
│       ├── LightingPool (10 fixed point lights)
│       ├── Grid (infinite, faded, non-interactive)
│       └── Effects (lazy Bloom → ACES tone mapping)
└── HUD
    ├── TopBar (theme, reset camera, photo mode)
    ├── TaskDrawer (add / complete / delete / reset)
    ├── InventoryHotbar (1–9, rotate, store, shop)
    ├── BuildShop modal (base / prop tabs)
    ├── ControlsLegend
    └── Toasts
```

## State model

`src/store/useWorldStore.ts` is the only writer of world data.

```ts
type ThemeMode = 'day' | 'night';
type TaskTier = 'quick' | 'standard' | 'deep';
type Rotation = 0 | 1 | 2 | 3;

interface PersistedWorld {
  coins: number;
  tasks: Task[];
  inventory: Record<string, number>;
  placedItems: PlacedItem[];
  themeMode: ThemeMode;
  graphicsQuality: 'high' | 'low';
}

interface PlacedItem {
  id: string;
  itemId: string;
  x: number;          // integer cell
  z: number;          // integer cell
  rotation: Rotation; // 90° steps
  placedAt: number;   // Date.now(), used for bounce animation
}
```

Transient UI state (`selectedItemId`, `selectedPieceId`, `movingItemId`, `movingRotation`, `rotation`, `storeMode`, `hydrated`) is never persisted.

### Key invariants

1. `inventory` counts unplaced stock. Placing decrements; storing increments. Buying never places directly.
2. `placedItems` contains at most one base tile and at most one prop per `(x, z)` cell.
3. A prop requires a base tile in the same cell; a base tile cannot be removed while a prop remains on it.
4. Task rewards are paid once. A completed task cannot be toggled back to incomplete.
5. Coins are clamped to `0..9,999,999`; inventory per item to `0..999`; coordinates to `±250`.
6. Unknown item IDs, duplicate IDs, non-integer cells, invalid rotations, and orphaned props are dropped on hydration.
7. Persistence writes only `PersistedWorld`; hydration merges sanitized data over the default state.
8. The point-light count is always ten. Never add or remove lights at runtime; pooled lights change position/color/intensity only.

### Actions

| Action | Behavior |
| --- | --- |
| `addTask(title, tier)` | Trims/limits title, prepends a task, returns `ActionResult`. |
| `toggleTask(id)` | Completes an incomplete task, pays the tier reward, sets `completedAt`. |
| `deleteTask(id)` | Removes a task; no refund. |
| `buyItem(itemId)` | Deducts cost and adds one unit to inventory. |
| `selectItem(itemId)` | Toggles build selection; refuses items with zero stock. Clears placed selection, moves, and store mode. |
| `selectPiece(placedId)` | Toggles selection of a placed piece; clears build selection and moves. |
| `rotate()` | Rotates the active context: the selected placed piece in place, `movingRotation` while lifted, otherwise the placement rotation. A selected base rotates its prop too. |
| `toggleStoreMode()` | Clears placement/move state; left-click becomes pickup. |
| `toggleGraphicsQuality()` | Flips the persisted `high`/`low` preset. |
| `beginMove(placedId)` | Lifts a piece (and its surface prop if it is a base) into the move ghost; clears placed selection. |
| `moveTo(x, z)` | Validates the target and moves the piece group without touching inventory. Failure keeps the move active for a retry. |
| `cancelMove()` | Puts the moving piece back at its original cell and returns it to selection. |
| `placeAt(x, z)` | Validates layer rules and stock, appends a piece, decrements inventory, clears any move. |
| `removeItem(placedId)` | Returns a piece to inventory; blocks base pickup under a prop. |
| `removeAtCell(x, z)` | Stores the prop first, otherwise the base. |
| `resetWorld()` | Restores starter courtyard, coins, tasks, and inventory. |

### Persistence

- Key: `moss-and-ember-v1`; schema version `1`; persisted `graphicsQuality` defaults to `high`.
- Storage: `localStorage` with a memory fallback if access throws.
- `sanitizePersisted` is deliberately defensive and unit-tested against hostile JSON.
- The `merge` hook always sets `hydrated: true`.
- No migration exists for version `0`; the starter world is the fallback.

## Placement and the two-layer grid

Coordinates are integer cell centers. A base tile renders at `[x, 0, z]`; a prop renders at `[x, 0.2333, z]`. The grid is infinite and uses `1`-unit cells.

Rather than attaching pointer handlers to every tile, the scene has one invisible `220×220` plane at `y = 0`. It receives `pointermove` and `click` for both layers:

```ts
const x = Math.round(event.point.x);
const z = Math.round(event.point.z);
```

This works because the plane is below every piece, but R3F still dispatches the event unless a nearer object stops propagation. Piece groups do exactly that on `click` and `contextmenu`, which enables right-click storage.

Validity:

- Base: no base at `(x, z)`; stock > 0.
- Prop: a base exists at `(x, z)`, no prop exists, stock > 0.

The ghost uses the same `MiniatureModel` as the real piece with a green/red translucent material and `depthWrite: false`.

### Instanced rendering

Placed pieces are grouped by `itemId` and rendered through `InstancedItemBatch`. Each GLB is loaded once, normalized, and its geometry is baked into a per-material primitive. One `InstancedMesh` per primitive per 512-piece chunk draws every repeated tile or prop; per-instance matrices carry cell position, Y rotation, and the placement bounce scale. Instance `instanceId` maps back to the placed piece for click/context raycasting. The moving/selection ghost and the missing-GLB fallback still use the non-instanced `MiniatureModel`.

This reduces repeated full scene-graph clones to one draw call per material primitive per item type (not literally one draw call for multi-material models). Selection, rotation, click-to-move, and right-click storage all continue to work through instance raycasting.

### Selecting, rotating, and moving placed pieces

With no build item selected, left-clicking a placed piece selects it and leaves it exactly where it is. A sage cell tint and a selection pill communicate the state. `R` or HUD **Rotate** rotates the selected piece in place in 90° steps; rotating a selected base rotates its attached prop by the same delta. Selection is persisted only as the piece's new rotation, never as UI state.

HUD **Store** returns the selected piece to inventory without entering store mode; with no selection it toggles click-to-store mode. **Move** / `M` lifts the selected piece into a move ghost, where the pointer previews the destination. Clicking a valid cell drops it; `Esc`, the hotbar cancel button, or a right-click cancels the move and returns the piece to selection. Moving does not touch inventory and is persisted as the same `PlacedItem` with new `x`/`z` and `placedAt`. A base tile also carries its surface prop. While lifted, `R` or HUD Rotate reorients the group; the ghost stays anchored at its last cell when the pointer moves onto the HUD. Moving a prop requires an empty base at the destination; moving a base requires a completely empty destination cell. Invalid drops keep the move active so the player can retry.

## GLB loader

`src/components/canvas/MiniatureModel.tsx`

1. `useGLTF(url)` loads and caches the scene.
2. `scene.clone(true)` isolates each placement.
3. `Box3.setFromObject` measures the clone.
4. Horizontal scale: `0.96 / max(size.x, size.z)`.
5. Vertical scale:
   - Props: same as horizontal (uniform).
   - Base tiles: `0.2333 / size.y` (height lock). Blender authors base tiles at exactly `0.2333`; the horizontal normalization would otherwise make them `0.336` tall and leave a visible gap under props.
6. Offset: `[-center.x * scale, -box.min.y * verticalScale, -center.z * scale]`.
7. Traverse: enable `castShadow`/`receiveShadow`; ghost mode swaps in a translucent tint material.
8. A class error boundary and Suspense fallback render a beveled block with the item name if a file is missing.
9. Lantern/fire props add a point light at night (`intensity 2.6` / `3.2`, warm colors, decay 2).

Placement bounce uses `Date.now()` for both the stored timestamp and the animation clock. Mixing `performance.now()` with `Date.now()` produces tiny or missing miniatures.

## Camera

- Perspective `fov: 32`, `near: 0.1`, `far: 160`.
- Default position `[7.4, 8.4, 9.6]`, target `[0, 0.2333, 0]`.
- `OrbitControls`: left mouse disabled (`LEFT: -1`), right drag rotates, middle drag pans, wheel zooms.
- Distances `4.5..48`; polar angle `0.2..0.475π` keeps the camera above the floating plane.
- Reset button remounts the target/position through a signal; no page reload.
- The task drawer occupies the top-right, so the default framing keeps the starter island in the left/center of the viewport.

## Lighting and post-processing

**Day**
- Page backdrop is CSS cream; the Canvas is alpha-transparent so High/Low clear color matches exactly after tone mapping. Fog uses `#F3EFE6` at near `80` / far `220` in day mode so zooming out does not haze the diorama.
- Ambient `#FFF8EA` at `0.62`; hemisphere sky `#FFF6E6` / ground `#C9B9A6` at `0.65`.
- Warm sun `#FFF5E4` at `1.8`, shadow map `2048²`, orthographic bounds `±14`. Props cap `envMapIntensity` at `0.35` and glazed-physical `specularIntensity` at `0.25`.
- Day mode is intentionally free of floating confetti or particle effects.

**Night**
- Page backdrop is CSS night `#221F1D`; the alpha-transparent Canvas lets it show through. A world-space spherical shell of 200 soft white star sprites (32px radial-gradient texture, additive blending) surrounds the island at radius 45–90 with `y = -45–45`; depth testing lets tiles and props occlude stars behind them, while the surrounding void stays starry with real parallax. Fog uses `#221F1D`.
- Soft neutral-warm moon `#9E9B94` at `0.45`; hemisphere `#6E6A63` / `#2E2A25` at `0.85`; ambient `#6B655D` at `0.25`.
- Lanterns and firepots are lit by the fixed `LightingPool`: ten permanent point lights follow the ten light-emitting props nearest the camera target. Every night light uses butter-gold `#FFD97D` at intensity `2.2`, distance `4.5`, decay `2`. Day mode sets all ten intensities to zero. Emissive GLB panels/flames use strength `4.0` and still bloom at night.
- Pooled lantern/firepot lights and emissive materials provide the night glow. High-quality Bloom adds a subtle halo; it does not shift flat base-tile colors.

**Post stack** — `EffectComposer` → `Bloom` (`mipmapBlur`, `luminanceThreshold 1.1`, intensity `0.45`) → `ToneMapping` (`ACES_FILMIC`). There is no N8AO, brightness/contrast, hue/saturation, or vignette pass. High-quality colors therefore match Low while HDR lantern cores and flames still bloom. Lantern glow panels and firepot flames are re-tinted to a warm golden yellow (`#FFC400`) in every mode through cloned emissive materials; intensity is `2.2` for High day, `3.0` for Low day, and `2.4` at night. Coals, props, and other colors are untouched, and the warm emissive keeps the fixtures visible when switching themes. Renderer exposure is `1.05`; the composer disables renderer tone mapping while active and the ACES effect supplies the same mode once.

**Quality presets** — High: Bloom + ACES tone mapping, DPR `[1, 1.75]`, 2048² sun shadow. Low: no composer, DPR `[1, 1.25]`, 1024² sun shadow. The preset is persisted. Toggling High dynamically imports the effects chunk; Low never requests it.

The infinite grid uses low-contrast day/night colors, `fadeDistance 30`, and `fadeStrength 2` so the horizon does not distract from the floating island.

## Audio

`src/lib/sound.ts` lazily creates an `AudioContext` and synthesizes short sine/triangle envelopes for task completion, placement, purchase, storage, errors, and UI clicks. No audio files are shipped. Browsers require a gesture; every call happens from a click/key handler.

## Rendering performance

- All geometry in a model is joined in Blender and exported as one mesh with multiple material primitives, minimizing draw calls.
- GLBs are committed at `22–111 KB` each (about `0.9 MB` total).
- The grid is a single drei `<Grid>` shader, not hundreds of meshes.
- The raycast surface is one plane; pieces stop propagation only for their own interactions.
- High-quality DPR is capped at `1.75`; Low caps it at `1.25`.
- Preload runs once on the first Diorama mount. Models are cached by `useGLTF`.
- A fixed ten-light pool means shader programs never change when lanterns are placed or stored.
- Instanced batches scale to hundreds of repeated pieces; a 400+ item stress seed renders without console errors.
- The effects chunk is code-split and only fetched when High is active; it contains Bloom + ACES tone mapping only.

## Testing

Vitest + jsdom cover the domain:

- starter world, buying, insufficient funds
- task completion is one-way
- base placement, prop prerequisites, occupied cells
- prop stacking rejection, storing, base-with-prop rejection
- selecting a piece, rotating a selected prop, rotating a selected base + prop, selection toggle
- moving a prop, moving a base with its prop, invalid move + cancel, cancel returns to selection
- rotation wrapping, hostile-persistence sanitization, graphics-quality toggle, reset

The UI and WebGL layers are verified visually with the headless-Chrome script in `docs/qa/visual-check.mjs`; see [QA.md](QA.md).

## Known trade-offs

- Base tiles are height-locked after horizontal normalization. This is intentional: it keeps props flush at `y = 0.2333` while preserving a small seam between adjacent tiles.
- There is no auth or cloud sync; `localStorage` is the product boundary.
- The scene is desktop-first. Small screens get a usable but denser HUD.
- Instanced rendering groups by material primitive, so a multi-material GLB still emits one draw call per material primitive (one per type per chunk), not one total.
- The infinite grid is visual only; the placement plane is `220×220` units, i.e. `±110` cells, while the store allows `±250` cells. Expanding beyond the plane's edge is not a supported interaction.
