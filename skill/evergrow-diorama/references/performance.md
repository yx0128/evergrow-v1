# Performance playbook

Three optimizations keep the diorama faithful to its GLBs while avoiding shader stutter, draw-call blowup, and a heavy initial payload.

## 1. Fixed six-light pool

Never render `<pointLight>` inside a miniature. The light count must never change, otherwise Three.js recompiles materials when lanterns are placed or stored.

`src/components/canvas/LightingPool.tsx`:

- Renders exactly six `<pointLight>` components permanently.
- Reads `placedItems`, filters definitions with `item.light`, and builds candidate world positions.
- Every frame:
  - `themeMode === 'day'` → all six `intensity = 0`.
  - Night → sort candidates by squared distance to the OrbitControls target, take six, copy position/color/distance, and set `intensity` (`2.6` lantern, `3.2` firepot). Unused slots are `0`.
- Colors: lantern `#FFC477`, firepot `#FF8A4C`.
- Heights: prop base `0.35` + lantern `0.52` / fire `0.42`.
- The GLB still carries emissive materials (`strength 4.0`) for bloom.

Verification: count `pointLight` renderers in code review, and check night/day in the browser. Adding a seventh light defeats the optimization.

## 2. Instanced placed items

`src/components/canvas/InstancedItemBatch.tsx` renders placed pieces by `itemId`:

1. `useGLTF(item.modelUrl)` loads the model once.
2. Clone it and normalize: horizontal `0.96`, base height lock `0.35`, centered X/Z, grounded.
3. Traverse meshes; clone each geometry and bake `mesh.matrixWorld` into it. Keep the material.
4. For each material primitive, create an `InstancedMesh` per chunk of up to 512 pieces.
5. Per-instance matrix: position `[x, base?0:0.35, z]`, Y rotation from `rotation * 90°`, scale from the 460 ms `easeOutBack` placement bounce using `Date.now()`.
6. `instanceId` maps to the chunk's piece for `onClick` / `onContextMenu`; stop propagation.
7. `frustumCulled={false}` because the geometry bounding sphere ignores instance positions.
8. On GLB failure, an error boundary falls back to the legacy `MiniatureModel` renderer for that item type.

Ghost previews, missing-GLB placeholders, and the moving preview stay non-instanced. Only one or two ghosts exist at a time.

Trade-off: multi-material GLBs produce one draw call per material primitive per item type per chunk, not literally one draw call for the entire model. The win is removing N full scene-graph clones and N draw calls per repeated instance.

Verification:

- Hundreds of tiles/props render without console errors.
- Click/select/rotate/move/store still work on instanced pieces.
- Rotation and bounce apply to every part of a model in lockstep.

## 3. Lazy post-processing and quality preset

`src/components/canvas/Effects.tsx` is a default-exported module containing `EffectComposer` → `Bloom` → `ToneMapping (ACES_FILMIC)`. It deliberately has no AO, brightness/contrast, hue/saturation, or vignette pass, so High colors match Low. Lantern/firepot high-emissive materials are cloned and re-tinted to warm yellow (`#FFC400`) in every mode: High day 2.2, Low day 3.0, night 2.4. Coals and everything else remain untouched. Bloom is `mipmapBlur`, `luminanceThreshold 1.1`, `intensity 0.45`.

`Scene.tsx`:

```ts
const Effects = lazy(() => import('./Effects'));
// ...
{graphicsQuality === 'high' ? (
  <Suspense fallback={null}>
    <Effects day={day} />
  </Suspense>
) : null}
```

Vite `manualChunks` assigns `@react-three/postprocessing`, `postprocessing`, and `maath` to a separate `postprocessing` chunk. Low quality must not request that chunk. Only HDR lantern cores/flames exceed the bloom threshold.

Quality contract:

| | High | Low |
| --- | --- | --- |
| EffectComposer | on | off |
| DPR | `[1, 1.75]` | `[1, 1.25]` |
| Sun shadow map | 2048² | 1024² |
| Persisted | `graphicsQuality: 'high'` | `graphicsQuality: 'low'` |

`DprController` calls R3F `setDpr`; do not remount the Canvas. The `Lights` component updates `shadow.mapSize`, disposes the old shadow map, and sets `shadow.needsUpdate`.

## Regression checklist

- [ ] Lanterns placed/removed do not change the light count.
- [ ] Day has zero pooled intensities; night has at most six.
- [ ] Instanced pieces still raycast for select/rotate/move/store.
- [ ] Base + prop move together; selected base rotates its prop.
- [ ] Low never fetches the effects chunk.
- [ ] High lazy-loads effects after initial render.
- [ ] High/Low persists in `localStorage`.
- [ ] 464-item stress seed renders without errors.
