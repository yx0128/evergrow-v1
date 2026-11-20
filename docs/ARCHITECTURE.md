# Architecture

Moss & Ember is a client-only Vite application. There is no server, account system, telemetry, or network dependency at runtime. The whole experience is a React tree wrapped around a single Three.js canvas, with Zustand as the authoritative world state and `localStorage` as the only persistence layer.

## Runtime layers

```text
App.tsx
├── WorldCanvas (Canvas + Suspense)
│   └── Scene
│       ├── CameraRig (OrbitControls, fov 32)
│       ├── Lights (day/night directional + ambient + hemisphere)
│       ├── DriftingLeaves / NightSky (Stars + moon)
│       ├── Diorama
│       │   ├── placed base tiles → MiniatureModel
│       │   ├── placed surface props → MiniatureModel
│       │   ├── ghost preview → MiniatureModel (ghost)
│       │   └── invisible raycast plane (both layers)
│       ├── Grid (infinite, faded, non-interactive)
│       └── Effects (N8AO → Bloom → Vignette)
└── HUD
    ├── TopBar (coins, theme, reset camera, photo mode)
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

Transient UI state (`selectedItemId`, `rotation`, `storeMode`, `hydrated`) is never persisted.

### Key invariants

1. `inventory` counts unplaced stock. Placing decrements; storing increments. Buying never places directly.
2. `placedItems` contains at most one base tile and at most one prop per `(x, z)` cell.
3. A prop requires a base tile in the same cell; a base tile cannot be removed while a prop remains on it.
4. Task rewards are paid once. A completed task cannot be toggled back to incomplete.
5. Coins are clamped to `0..9,999,999`; inventory per item to `0..999`; coordinates to `±250`.
6. Unknown item IDs, duplicate IDs, non-integer cells, invalid rotations, and orphaned props are dropped on hydration.
7. Persistence writes only `PersistedWorld`; hydration merges sanitized data over the default state.

### Actions

| Action | Behavior |
| --- | --- |
| `addTask(title, tier)` | Trims/limits title, prepends a task, returns `ActionResult`. |
| `toggleTask(id)` | Completes an incomplete task, pays the tier reward, sets `completedAt`. |
| `deleteTask(id)` | Removes a task; no refund. |
| `buyItem(itemId)` | Deducts cost and adds one unit to inventory. |
| `selectItem(itemId)` | Toggles selection; refuses items with zero stock. Clears store mode. |
| `rotate()` | Increments rotation modulo 4. |
| `toggleStoreMode()` | Clears placement selection; left-click becomes pickup. |
| `placeAt(x, z)` | Validates layer rules and stock, appends a piece, decrements inventory. |
| `removeItem(placedId)` | Returns a piece to inventory; blocks base pickup under a prop. |
| `removeAtCell(x, z)` | Stores the prop first, otherwise the base. |
| `resetWorld()` | Restores starter courtyard, coins, tasks, and inventory. |

### Persistence

- Key: `moss-and-ember-v1`; schema version `1`.
- Storage: `localStorage` with a memory fallback if access throws.
- `sanitizePersisted` is deliberately defensive and unit-tested against hostile JSON.
- The `merge` hook always sets `hydrated: true`.
- No migration exists for version `0`; the starter world is the fallback.

## Placement and the two-layer grid

Coordinates are integer cell centers. A base tile renders at `[x, 0, z]`; a prop renders at `[x, 0.35, z]`. The grid is infinite and uses `1`-unit cells.

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

## GLB loader

`src/components/canvas/MiniatureModel.tsx`

1. `useGLTF(url)` loads and caches the scene.
2. `scene.clone(true)` isolates each placement.
3. `Box3.setFromObject` measures the clone.
4. Horizontal scale: `0.96 / max(size.x, size.z)`.
5. Vertical scale:
   - Props: same as horizontal (uniform).
   - Base tiles: `0.35 / size.y` (height lock). Blender authors base tiles at exactly `0.35`; the horizontal normalization would otherwise make them `0.336` tall and leave a visible gap under props.
6. Offset: `[-center.x * scale, -box.min.y * verticalScale, -center.z * scale]`.
7. Traverse: enable `castShadow`/`receiveShadow`; ghost mode swaps in a translucent tint material.
8. A class error boundary and Suspense fallback render a beveled block with the item name if a file is missing.
9. Lantern/fire props add a point light at night (`intensity 2.6` / `3.2`, warm colors, decay 2).

Placement bounce uses `Date.now()` for both the stored timestamp and the animation clock. Mixing `performance.now()` with `Date.now()` produces tiny or missing miniatures.

## Camera

- Perspective `fov: 32`, `near: 0.1`, `far: 160`.
- Default position `[7.4, 8.4, 9.6]`, target `[0, 0.35, 0]`.
- `OrbitControls`: left mouse disabled (`LEFT: -1`), right drag rotates, middle drag pans, wheel zooms.
- Distances `4.5..48`; polar angle `0.2..0.475π` keeps the camera above the floating plane.
- Reset button remounts the target/position through a signal; no page reload.
- The task drawer occupies the top-right, so the default framing keeps the starter island in the left/center of the viewport.

## Lighting and post-processing

**Day**
- Background `#F3EFE6`.
- Ambient `#FFF8EA` at `0.62`; hemisphere sky `#FFF6E6` / ground `#C9B9A6` at `0.95`.
- Warm sun `#FFF5E4` at `2.35`, shadow map `2048²`, orthographic bounds `±14`.
- Pastel leaves drift with a sine sway.

**Night**
- Background `#16181D`; drei `<Stars>` with moon sphere.
- Cool moon `#AFC4FF` at `1.15`; ambient `#68789F` at `0.24`.
- Lanterns and firepots add local point lights; emissive GLB panels/flames use strength `4.0`.
- Bloom intensity rises from `0.25` to `1.05`; vignette deepens.

**Post stack** — `EffectComposer` → `N8AO` (`aoRadius 1.5`, medium quality, half-res) → `Bloom` (`luminanceThreshold 1.0`, mipmap blur) → `Vignette`. SSAO/N8AO provides contact darkening in crevices without baking shadow maps per object.

The infinite grid uses low-contrast day/night colors, `fadeDistance 30`, and `fadeStrength 2` so the horizon does not distract from the floating island.

## Audio

`src/lib/sound.ts` lazily creates an `AudioContext` and synthesizes short sine/triangle envelopes for task completion, placement, purchase, storage, errors, and UI clicks. No audio files are shipped. Browsers require a gesture; every call happens from a click/key handler.

## Rendering performance

- All geometry in a model is joined in Blender and exported as one mesh with multiple material primitives, minimizing draw calls.
- GLBs are committed at `22–111 KB` each (about `0.9 MB` total).
- The grid is a single drei `<Grid>` shader, not hundreds of meshes.
- The raycast surface is one plane; pieces stop propagation only for their own interactions.
- `<Canvas>` DPR is capped at `1.75`; pixel ratio is a common source of laptop heat.
- Preload runs once on the first Diorama mount. Models are cached by `useGLTF`.

## Testing

Vitest + jsdom cover the domain:

- starter world, buying, insufficient funds
- task completion is one-way
- base placement, prop prerequisites, occupied cells
- prop stacking rejection, storing, base-with-prop rejection
- rotation wrapping, hostile-persistence sanitization, reset

The UI and WebGL layers are verified visually with the headless-Chrome script in `docs/qa/visual-check.mjs`; see [QA.md](QA.md).

## Known trade-offs

- Base tiles are height-locked after horizontal normalization. This is intentional: it keeps props flush at `y = 0.35` while preserving a small seam between adjacent tiles.
- There is no auth or cloud sync; `localStorage` is the product boundary.
- The scene is desktop-first. Small screens get a usable but denser HUD.
- The infinite grid is visual only; the placement plane is `220×220` units, i.e. `±110` cells, while the store allows `±250` cells. Expanding beyond the plane's edge is not a supported interaction.
