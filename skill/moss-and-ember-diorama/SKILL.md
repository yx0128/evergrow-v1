---
name: moss-and-ember-diorama
description: Build and ship a polished, desktop-first 3D isometric miniature diorama with React 18, TypeScript, Vite, Three.js, a task-powered coin economy, two-layer 1x1 placement, real Blender-sculpted GLB models, day/night lighting, validated localStorage persistence, professional documentation, CI, visual QA, and a published skill backup. Use when someone asks for a cozy 3D diorama, a task-reward world builder, a Three.js isometric garden, a Blender-to-GLB pipeline, or a complete from-scratch web app with release engineering.
---

# Moss & Ember Diorama

A complete playbook for shipping a cozy floating miniature courtyard where real tasks earn coins, coins buy 1×1 tiles and props, and every asset is a real Blender-sculpted GLB.

Reference implementation: <https://github.com/yx0128/moss-and-ember>
Skill backup: <https://github.com/yx0128/moss-and-ember-diorama-skill>

## What this skill produces

1. A working Vite + React 18 + TypeScript + Tailwind desktop app.
2. A floating infinite 1×1 grid with a two-layer build system: base tiles at `y=0`, surface props at `y=0.35`.
3. A task → coin economy (10 / 25 / 50) with a one-way completion rule.
4. Thirteen Blender-authored GLB miniatures, a runtime auto-normalizer, ghost placement, right-click storage, and a labeled fallback.
5. Day/night themes with bloom, N8AO, shadows, lantern/firepoint lights, drifting leaves, and a starfield.
6. Validated Zustand persistence, 14 store tests, and a headless-Chrome QA script.
7. Professional docs, CI, a session-state report, a single clean initial commit, and a GitHub release.
8. A reusable skill backup repository.

## Non-negotiables

- **Palette:** cream `#F3EFE6`, sand `#D9BE8F`, sage `#93A87B`, moss `#556B45`, terracotta `#D08A67`, rose `#D98A92`, gold `#E0B15E`, slate `#7E8B99`, ink `#3A3730`, night `#16181D`. No neon, pure white, or pure black.
- **Scale:** every item is 1×1. Base tiles are exactly `0.35` tall in world space; props sit flush at `y=0.35`.
- **Interaction:** left click builds, right drag orbits, middle drag pans, wheel zooms, `R` rotates, right-click stores, `1–9` selects, `B` opens shop, `H` hides the HUD, `Esc` cancels.
- **Persistence:** coins, tasks, inventory, placed items, theme only. Validate untrusted saves.
- **No backend:** no accounts, analytics, network assets, or required environment variables.
- **Visual verification is mandatory.** A passing build is not enough.

## Version pins that work together

```json
{
  "@react-three/drei": "^9.117.3",
  "@react-three/fiber": "^8.17.10",
  "@react-three/postprocessing": "^2.19.1",
  "n8ao": "^2.1.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "three": "^0.170.0",
  "three-stdlib": "^2.35.6",
  "zustand": "^5.0.1",
  "vite": "^5.4.11",
  "vitest": "^2.1.8",
  "typescript": "~5.6.3",
  "tailwindcss": "^3.4.15",
  "lucide-react": "^0.468.0"
}
```

React 19 with R3F 8 will fail peer resolution. Keep React 18 / R3F 8 / drei 9.

## Workflow

### Phase 1 — Protect credentials and confirm tools

```bash
node --version        # 20+
npm --version
blender --version     # 4.2+; macOS: /Applications/Blender.app/Contents/MacOS/Blender
gh auth status        # once; avoid repeated Keychain reads
```

Capture a GitHub token once when publishing:

```bash
export GH_TOKEN="$(gh auth token)"
```

### Phase 2 — Scaffold

Create:

```text
public/models/  scripts/  docs/  docs/qa/  docs/screenshots/
src/{components/{canvas,ui},data,lib,store,test,theme}
.github/{workflows,ISSUE_TEMPLATE}
skill/moss-and-ember-diorama/references/
```

Add Vite/TS/Tailwind/ESLint/Vitest configs. `.gitignore` must exclude `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo`, `.env*`, `.DS_Store`, and `*.blend1`.

### Phase 3 — Domain first

1. `src/types.ts` — `ItemDef`, `Task`, `PlacedItem`, `PersistedWorld`, `ActionResult`, `ThemeMode`, `TaskTier`, `Rotation`.
2. `src/data/items.ts` — 13 items, costs, rewards, starter world (80 coins, 3×3 sandstone, 2 props), `BASE_HEIGHT=0.35`, `FOOTPRINT=0.96`.
3. `src/lib/grid.ts` — `cellKey`, `findBase`, `findProp`, `worldToCell`, `rotationToRadians`.
4. `src/lib/sound.ts` — lazy Web Audio envelopes.
5. `src/store/useWorldStore.ts` — actions, safe storage, strict sanitization.
6. `src/test/worldStore.test.ts` — 14 tests.

Do not start the canvas until `npm test` and `npm run typecheck` are green.

### Phase 4 — Canvas

`MiniatureModel.tsx`:

```ts
const scale = 0.96 / Math.max(size.x, size.z, 0.0001);
const verticalScale =
  item.category === 'base' ? 0.35 / Math.max(size.y, 0.0001) : scale;
const offset = [-center.x * scale, -box.min.y * verticalScale, -center.z * scale];
```

- Clone the cached GLB; measure with `Box3`.
- Base tiles get a vertical height lock so their top stays at `0.35`; props scale uniformly.
- Enable `castShadow`/`receiveShadow`; swap to a translucent tint in ghost mode.
- Add night point lights for `stone_lantern` and `firepot`.
- Wrap with a class error boundary + Suspense fallback; render a labeled beveled block if a GLB is missing.
- Animate placement with `easeOutBack` using `Date.now()` for both storage and animation.

`Diorama.tsx`:

- Bases at `y=0`; props at `y=0.35`.
- Piece groups call `stopPropagation` on click/context menu.
- One invisible `220×220` plane at `y=0` handles pointer move/click for both layers.
- Ghost uses the same model, green/coral tint, and a faint cell tint.
- Preload all models once.

`Scene.tsx`:

- Camera `[7.4, 8.4, 9.6]`, `fov 32`, target `[0, 0.35, 0]`.
- `OrbitControls` `LEFT: -1`, right rotate, middle pan, polar `0.2..0.475π`.
- Day: cream background, warm sun `#FFF5E4` at `2.35`, hemisphere fill, drifting pastel leaves.
- Night: `#16181D`, stars, moon, cool fill, local lantern/fire light, stronger bloom.
- `<Grid infiniteGrid fadeDistance={30} fadeStrength={2} />`.
- `EffectComposer` → `N8AO (radius 1.5)` → `Bloom (threshold 1.0)` → `Vignette`.
- Camera reset via a signal prop, not a page reload.

### Phase 5 — HUD

Top bar (brand, coins, theme, reset camera, photo mode), collapsible task drawer (tier rewards visible, one-way completion, delete, reset), inventory hotbar (nine slots, stock badges, `1–9`, rotate/store/shop), build shop modal (base/prop tabs, affordable states, owned counts), toasts, controls legend, photo-mode exit pill.

Panels are cream glass in both themes. Use Georgia for display and Avenir/Segoe for UI. Keep the diorama out from under the right-hand drawer.

### Phase 6 — Blender GLB art

Author all 13 models in `scripts/generate_models.py`:

- bevel modifiers on every box; subdivision where needed;
- bmesh vertex jitter for foliage, stone puffs, petals, produce;
- lathe profiles for pots, pedestals, balusters, lantern posts/finials, flames;
- Bezier tubes for trunks, branches, stems, roots, armrests;
- 25 tapered grass blades in one mesh;
- layered petal blooms.

Materials: Principled BSDF, roughness `0.82–0.90`, translucent teal water (`transmission` + `IOR 1.33`), emission strength **4.0** for lantern cores and flames.

Export with:

```python
bpy.ops.export_scene.gltf(
    filepath=path, export_format="GLB", use_selection=True,
    export_apply=True, export_animations=False, export_cameras=False,
    export_lights=False, export_extras=False, export_yup=True,
    export_materials="EXPORT", export_texcoords=False,
)
```

Finalize each model before export: join all parts, apply modifiers, center X/Z, ground at `Z=0`, enforce base `1.0×1.0×0.35` and props `≤0.92×0.92`.

Run:

```bash
blender --background --python scripts/generate_models.py
# or
npm run models
```

See [references/glb-pipeline.md](references/glb-pipeline.md).

### Phase 7 — Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 4183
```

Visual QA is mandatory. Use `docs/qa/visual-check.mjs` (puppeteer-core outside the repo) to:

- seed a rich courtyard;
- confirm no console/page errors;
- complete a task and assert +10 coins;
- buy a tile and assert −14 coins / +1 stock;
- select and place it on the grid; assert placed +1 / stock −1;
- reload and assert persistence;
- capture day/night/UI/shop screenshots at `1440×900`.

Also inspect for floating props, ghost lag, z-fighting, bloom blowout, hidden diorama, and unreadable night scenes.

### Phase 8 — Documentation

Required:

- `README.md` (hero, screenshots, quick start, controls, catalog, architecture, art, credits, license)
- `AGENTS.md` and `docs/AGENT_GUIDE.md`
- `docs/ARCHITECTURE.md`, `docs/ART_PIPELINE.md`, `docs/DESIGN.md`, `docs/QA.md`, `docs/REPRODUCTION.md`, `docs/RELEASE_CHECKLIST.md`
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `LICENSE`
- `.github/workflows/ci.yml`, issue templates, PR template, Dependabot
- `public/models/README.md`
- `STATE.md`

### Phase 9 — Session state

Find the OpenCode session ID:

```bash
grep 'session.id=ses_' ~/.local/share/opencode/log/opencode.log | tail -1
```

Query read-only:

```bash
sqlite3 -readonly ~/.local/share/opencode/opencode.db "
SELECT id, title, model, cost,
       tokens_input, tokens_output, tokens_reasoning,
       tokens_cache_read, tokens_cache_write,
       datetime(time_created/1000,'unixepoch') AS created_utc,
       datetime(time_updated/1000,'unixepoch') AS updated_utc
FROM session WHERE id='ses_REPLACE_ME';"
```

Record UTC + local times, wall-clock duration, all five token columns, raw total, cost, model, agent, exact SQL, and the caveat that the snapshot excludes the final assistant reply. Credit OpenCode and the model.

### Phase 10 — Publish without Keychain loops

```bash
export GH_TOKEN="$(gh auth token)"   # one keychain read
gh repo create USER/REPO --public --description "Moss & Ember — a cozy 3D isometric task diorama."
git init -b main
git add -A
git commit -m "Initial commit: Moss & Ember"
git remote add origin "https://github.com/USER/REPO.git"
export GIT_ASKPASS="$(mktemp -t askpass)"
cat > "$GIT_ASKPASS" <<'SH'
#!/bin/sh
case "$1" in
  Username*) printf 'x-access-token\n' ;;
  Password*) printf '%s\n' "$GH_TOKEN" ;;
esac
SH
chmod 700 "$GIT_ASKPASS"
GIT_TERMINAL_PROMPT=0 git -c credential.helper= push -u origin main
```

Never put the token in the remote URL, `.git/config`, a file, or shell history. Do not force-push a shared repo. If you renamed a project or need a clean history, create an orphan branch, commit once, and replace `main`; then show `git log --oneline`.

### Phase 11 — Skill backup

Copy this directory to:

- `~/.claude/skills/moss-and-ember-diorama/`
- `~/.config/opencode/skills/moss-and-ember-diorama/` (if present)

Publish `skill/moss-and-ember-diorama/` as its own public repo (`moss-and-ember-diorama-skill`) using the same askpass flow. Add a README linking back to the app.

## Testing checklist

- [ ] 14 store tests pass.
- [ ] Typecheck/lint/build clean.
- [ ] Task pays once; chime + toast fire.
- [ ] Purchase → select → place → reload persists.
- [ ] Occupied cell rejected; ghost turns coral.
- [ ] Prop without base rejected; two props on one cell rejected.
- [ ] Base with prop cannot be stored until the prop is removed.
- [ ] Rotate, store mode, right-click storage, `1–9`, `B`, `H`, `Esc` all work.
- [ ] Day/night changes background, lights, leaves/stars, bloom.
- [ ] All 13 GLBs load; no fallback labels.
- [ ] No console errors.
- [ ] Corrupt localStorage cannot crash the scene.
- [ ] Screenshots refreshed.
- [ ] No secrets, `dist/`, or `node_modules/` committed.
- [ ] Single clean initial commit; `git log` shows no old project name.
- [ ] `STATE.md` complete and credits OpenCode + the model.

## Common failure modes

| Failure | Fix |
| --- | --- |
| Props float above base tiles | Height-lock base tiles to `0.35` after horizontal normalization. |
| Ghost does not track the pointer | Keep one raycast plane at `y=0`; stop propagation on pieces. |
| Left click orbits | `OrbitControls` `LEFT: -1`. |
| Double action on a piece | Missing `event.stopPropagation()`. |
| Tiny/buried GLB | Wrong `Box3` measurement, `FOOTPRINT`, or grounding offset. |
| Bloom blowout | Lower bloom intensity; keep threshold `1.0`. |
| Night unreadable | Keep ambient/hemisphere fill; point lights are supplemental. |
| Blender bevels missing | `export_apply=True`. |
| Blender 5 socket KeyError | Use `Emission Color`, `Emission Strength`, `Transmission Weight`. |
| jsdom has no localStorage (Node 26) | Polyfill in `src/test/setup.ts`; use a safe storage adapter. |
| Preview shows another project | Pass an explicit free port; verify the title. |
| Repeated Keychain prompts | One `gh auth token`, `GIT_ASKPASS`, `credential.helper=`. |
| Grid looks like clipped text at the top | `fadeDistance 30`, `fadeStrength 2`, low-contrast colors. |

## Definition of done

A stranger can clone the repo, run `npm install && npm run dev`, understand the contracts, regenerate the art with Blender, verify the flows, publish their own version, and read the session state — without asking the original author anything.

## References

- [references/design-contract.md](references/design-contract.md)
- [references/glb-pipeline.md](references/glb-pipeline.md)
- [references/release-checklist.md](references/release-checklist.md)
