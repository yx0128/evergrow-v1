<div align="center">
  <img src="docs/screenshots/hero-day.png" alt="Moss & Ember floating miniature courtyard at golden hour" width="100%" />
  <h1>Moss &amp; Ember</h1>
  <p><strong>A cozy 3D isometric miniature diorama that grows from the real-life tasks you finish.</strong></p>
  <p>
    <a href="https://github.com/yx0128/moss-and-ember/actions"><img alt="CI" src="https://github.com/yx0128/moss-and-ember/actions/workflows/ci.yml/badge.svg" /></a>
    <img alt="License" src="https://img.shields.io/badge/license-MIT-6F8558" />
    <img alt="React" src="https://img.shields.io/badge/React-18.3-3A3730" />
    <img alt="Three.js" src="https://img.shields.io/badge/Three.js-0.170-3A3730" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-5.4-3A3730" />
    <img alt="Blender" src="https://img.shields.io/badge/Blender-5.3-3A3730" />
  </p>
</div>

## The idea

Finish a small task, earn coins, and place a hand-sculpted miniature into a floating courtyard in space. Every tile is `1×1`; every prop is art, not an emoji. The world is quiet, tactile, and deliberately low-pressure.

- **Task → coin loop.** Quick tasks pay `10`, standard tasks `25`, deep work `50`. Completion is one-way, so the economy cannot be farmed by unchecking.
- **Two-layer building.** Place base tiles on empty cells, then place surface props on top of a base tile. Props never float and never share a cell.
- **Real `.glb` engine.** Thirteen Blender-sculpted GLB miniatures are loaded at runtime, auto-normalized to a `0.96` footprint, auto-grounded, and shadow-enabled.
- **Day and night.** Warm cream daylight with drifting pastel leaves; a charcoal starfield with moonlight, lantern point lights, firepot glow, bloom, and ambient occlusion.
- **Desktop-first HUD.** Glass task drawer, inventory hotbar (`1–9`), build shop (`B`), photo mode (`H`), and a camera reset that always brings you home.
- **No backend.** No accounts, analytics, network calls, or API keys. Only `localStorage` — validated on read.

## Screenshots

| Daylight courtyard | Night garden |
| --- | --- |
| ![Day](docs/screenshots/hero-day.png) | ![Night](docs/screenshots/hero-night.png) |

| Full interface | Build shop |
| --- | --- |
| ![Interface](docs/screenshots/ui-day.png) | ![Shop](docs/screenshots/shop.png) |

## Quick start

Requirements: **Node.js 20+**, **npm 10+**. Regenerating art additionally needs **Blender 4.2+** (tested with 5.3).

```bash
git clone https://github.com/yx0128/moss-and-ember.git
cd moss-and-ember
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`). A fresh save starts with a `3×3` sandstone courtyard, `80` coins, and two props in the hotbar.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

## Controls

| Input | Action |
| --- | --- |
| Left click | Place the selected item on a valid cell |
| `1`–`9` | Select a hotbar slot |
| `R` or HUD **Rotate** | Rotate the ghost in 90° steps |
| Right click a piece | Return it to inventory |
| HUD **Store** | Toggle click-to-store mode |
| Right drag | Orbit the camera |
| Middle drag | Pan the camera |
| Wheel | Zoom |
| `B` | Open or close the build shop |
| `Esc` | Cancel placement / close the shop / clear store mode |
| `H` | Photo mode (hide HUD); press again to return |
| HUD **Reset Camera** | Return to the reference isometric view |
| Task **Reset** | Restore the starter world (confirmation required) |

## Economy and catalog

| Tier | Reward |
| --- | ---: |
| Quick | 10 |
| Standard | 25 |
| Deep Work | 50 |

| Base tile | Cost | Surface prop | Cost |
| --- | ---: | --- | ---: |
| Sandstone Tile | 12 | Stone Lantern | 40 |
| Slate Tile | 16 | Birdbath Fountain | 55 |
| Grass Tile | 14 | Balustrade | 22 |
| Water Basin | 30 | Firepot | 48 |
| Stone Stairs | 34 | Rose Planter | 30 |
| | | Blossom Tree | 85 |
| | | Market Stall | 110 |
| | | Wooden Bench | 32 |

## Real sculpted GLB art

All thirteen miniatures are authored by `scripts/generate_models.py` through Blender's Python API. The script uses bevels, subdivision, lathe profiles, bmesh jitter, layered rose petals, flame profiles, and Principled BSDF materials. Lantern cores and flames use emission strength `4.0` so the WebGL bloom pass catches them at night.

```bash
# Blender on PATH
blender --background --python scripts/generate_models.py

# macOS app bundle
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/generate_models.py

# or use the cross-platform wrapper (honours BLENDER_BIN)
npm run models
```

Outputs are written to `public/models/*.glb`. Each model is centered on X/Z, grounded at `Z = 0` in Blender, and exported with `export_yup=True` and `export_apply=True`. At runtime, `<MiniatureModel />` measures the GLB, scales the largest horizontal edge to `0.96` world units, grounds the bounding box to `y = 0`, and enables `castShadow`/`receiveShadow`. Base tiles receive a tiny vertical height lock so their surface stays exactly at `y = 0.35`; props sit flush there.

See [docs/ART_PIPELINE.md](docs/ART_PIPELINE.md) for the coordinate contract, material rules, and per-model notes.

## Architecture at a glance

```text
src/
  components/canvas/   Three.js scene, diorama, GLB loader, camera
  components/ui/       Top bar, task drawer, hotbar, shop, toasts
  data/items.ts        Catalog, costs, rewards, starter world
  lib/                 Grid helpers, sound, IDs
  store/               Zustand store + validated localStorage persistence
  test/                Vitest store tests
scripts/
  generate_models.py   Blender-authored GLB pipeline
  generate_models.sh   Blender launcher
public/models/         13 committed GLB assets
docs/                  Architecture, art, QA, reproduction, design
skill/                 Portable AI-agent skill backup
```

Key contracts:

- Store key `moss-and-ember-v1`, version `1`.
- Persisted fields only: `coins`, `tasks`, `inventory`, `placedItems`, `themeMode`.
- `placedItems` are validated on every read: known item IDs, integer cells, unique cells per layer, and props require a base tile.
- One invisible `220×220` raycast plane receives clicks for both layers; placed pieces stop propagation so right-click storage is reliable.
- Camera: `fov 32`, position `[7.4, 8.4, 9.6]`, target `[0, 0.35, 0]`, right-drag orbit, clamped polar angle.
- Effects: N8AO (`aoRadius 1.5`) + Bloom (`luminanceThreshold 1.0`) + Vignette.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full data flow and invariants.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — data model, grid rules, renderer, persistence.
- [Art pipeline](docs/ART_PIPELINE.md) — Blender script, materials, model specs.
- [Design contract](docs/DESIGN.md) — palette, layout, camera, motion.
- [QA playbook](docs/QA.md) — automated interaction checks and visual QA.
- [Reproduction guide](docs/REPRODUCTION.md) — build the whole project from an empty directory.
- [Agent guide](docs/AGENT_GUIDE.md) — concise handoff for AI coding agents.
- [Release checklist](docs/RELEASE_CHECKLIST.md) — publish and verify.
- [Session state](STATE.md) — time, token usage, model, and credits for the build session.
- [Skill backup](skill/moss-and-ember-diorama/SKILL.md) — reusable agent playbook, also published at [moss-and-ember-diorama-skill](https://github.com/yx0128/moss-and-ember-diorama-skill).

## Quality gates

```bash
npm ci
npm run typecheck
npm run lint
npm test        # 14 store tests
npm run build
```

Visual QA is mandatory. `docs/qa/visual-check.mjs` drives headless Chrome at `1440×900`, seeds a rich courtyard, exercises task completion, purchase, placement, and persistence, and captures the four screenshots used above.

## Credits

Built in a single session with **[OpenCode](https://opencode.ai)** running the model **`opencode-go/deepseek-v4.1-flash`**. Art and code were generated by the agent and verified with TypeScript, ESLint, Vitest, Vite, and headless Chrome.

Standing on the shoulders of:

- [React](https://react.dev), [Vite](https://vite.dev), [TypeScript](https://www.typescriptlang.org)
- [Three.js](https://threejs.org), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei), [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing), [n8ao](https://github.com/n8ao/n8ao)
- [Zustand](https://zustand.docs.pmnd.rs), [Tailwind CSS](https://tailwindcss.com), [lucide-react](https://lucide.dev)
- [Blender](https://www.blender.org)

The cozy miniature tone is inspired by the broader genre of garden diorama games; this is an original implementation with original sculpted assets.

## License

[MIT](LICENSE) © 2026 Moss & Ember contributors.
