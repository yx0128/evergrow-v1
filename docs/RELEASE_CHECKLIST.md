# Release checklist

## Repository

- [ ] `package.json` name is `evergrow`; version follows semver.
- [ ] README hero, screenshots, quick start, controls, catalog, architecture, credits, and license are current.
- [ ] `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ART_PIPELINE.md`, `docs/DESIGN.md`, `docs/QA.md`, `docs/REPRODUCTION.md`, `docs/AGENT_GUIDE.md` are current.
- [ ] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `LICENSE`.
- [ ] `.github/workflows/ci.yml`, issue templates, PR template, Dependabot.
- [ ] `public/models/README.md` and all 16 GLBs.
- [ ] `public/music` and `public/ambience` audio assets present.
- [ ] `STATE.md` committed last.

## Quality gates

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 4183
```

- [ ] 61 tests pass (`worldStore`, tasks, calendar, focus, audio, hotbar).
- [ ] TypeScript and ESLint emit no errors or warnings.
- [ ] Production build succeeds.
- [ ] Headless QA passes with zero console/page errors.
- [ ] All 16 GLBs load (no fallback labels).
- [ ] Exactly ten pooled point lights; day zero, night nearest ten.
- [ ] Placed items are instanced and still support select/rotate/move/store.
- [ ] Low quality skips post-processing; High lazy-loads it.
- [ ] High/Low persists across reload.
- [ ] Task payout, subtasks, editing, filters, calendar drag-drop, purchase, selling, placement, storage, and reload persistence verified.
- [ ] Day, night, shop, task tab, sound, and focus screenshots refreshed at 1440×900.
- [ ] Diorama is not obscured by the task bar, task tab, or hotbar.
- [ ] Audio is silent until Play; focus timers continue when their panel is closed.
- [ ] Week and Day calendar panes keep a fixed height and scroll internally.
- [ ] No gap between props and base tiles.

## Art

- [ ] `npm run models` succeeds; all 16 files are non-zero.
- [ ] Base tiles print `1.000 × 1.000 × 0.233`.
- [ ] Props print footprints `≤ 0.925`.
- [ ] Lantern/flame emission is visible at night and blooms correctly.
- [ ] No `.blend`, `.blend1`, or temporary files.

## Git

- [ ] `git status` is clean after the final commit.
- [ ] Single clean history: `Initial commit: Evergrow` (or a deliberate set of reviewed commits).
- [ ] No secrets, tokens, `dist/`, `node_modules/`, or build caches.
- [ ] Remote URL does not contain a token.
- [ ] CI is green on `main`.
- [ ] Pages workflow is green and the live demo loads all 16 GLBs.
- [ ] `https://yx0128.github.io/evergrow-v1/` is set as the repository homepage.

## GitHub

- [ ] Repository description and topics set.
- [ ] Default branch `main`.
- [ ] Live demo link resolves and is recorded in the README and repository homepage.
- [ ] Skill backup repository published and linked.
- [ ] No Keychain prompt loop during pushes.

## Session state

- [ ] `STATE.md` includes session ID, model, start/end times (UTC + local), wall-clock duration, input/output/reasoning/cache tokens, total, cost, and credits.
- [ ] The SQL used to obtain the snapshot is included.
- [ ] The caveat that the snapshot excludes the final assistant reply is recorded.
