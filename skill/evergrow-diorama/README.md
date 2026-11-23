# Evergrow Diorama — agent skill

A reusable playbook for building a desktop-first 3D isometric task diorama with React, Three.js, and real Blender-sculpted GLB art.

- **App:** <https://github.com/yx0128/moss-and-ember>
- **Skill entry point:** [SKILL.md](SKILL.md)

## What is inside

- `SKILL.md` — full workflow, version pins, contracts, QA, publishing.
- `references/design-contract.md` — palette, layout, camera, persistence schema.
- `references/glb-pipeline.md` — Blender coordinate contract, helpers, materials, export, pitfalls.
- `references/performance.md` — fixed light pool, instancing, lazy effects, quality presets.
- `references/release-checklist.md` — quality gates, session-state SQL, GitHub publishing without Keychain loops.

## Install

Copy this directory to your agent's skill folder:

```bash
cp -R moss-and-ember-diorama ~/.claude/skills/
# or
cp -R moss-and-ember-diorama ~/.config/opencode/skills/
```

Then ask for “a cozy 3D isometric task diorama with real GLB art” or similar.

## License

MIT.
