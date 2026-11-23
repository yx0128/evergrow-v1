# Contributing

Thanks for wanting to make Evergrow cozier.

## Setup

```bash
npm ci
npm run dev
```

Use Node 20+. Regenerating art requires Blender 4.2+.

## Before opening a pull request

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

For visual or interaction changes, also run the headless QA pass in [docs/QA.md](docs/QA.md) and attach a screenshot or short clip.

## Code style

- TypeScript strict; no `any` unless an external API forces it, and then isolate the cast.
- Keep domain logic in the store or `src/lib`; keep components about rendering.
- Follow the existing Tailwind tokens in `tailwind.config.js` and the CSS component classes in `src/index.css`.
- Do not add comments that restate code. Explain non-obvious contracts in `docs/`.
- Do not introduce a backend, analytics, or network calls.

## Art changes

- Edit `scripts/generate_models.py`, then run `npm run models`.
- Keep the coordinate contract: centered X/Z, grounded at Z=0, base tiles 1×1×0.35, props ≤0.92 footprint.
- Commit the regenerated GLBs with the script change.
- Do not hand-edit GLB binaries or commit `.blend1` backups.

## Data and persistence

- Extend `sanitizePersisted` whenever the persisted shape changes.
- Add a Vitest case for every new invariant.
- Bump the storage version and provide a migration if old saves must survive.

## Commits

Use the imperative mood and a short scope when helpful:

```text
Add water basin ripples
Fix base tile height lock
Document Blender regeneration
```

One logical change per commit. Do not commit `dist/`, `node_modules/`, secrets, or generated QA screenshots outside `docs/screenshots/`.

## Reporting issues

Use the issue templates. Include:

- what you expected;
- what happened;
- steps to reproduce, including a save state if relevant;
- browser + OS;
- console errors and a screenshot.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
