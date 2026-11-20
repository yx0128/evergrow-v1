# QA playbook

A green build is necessary but not sufficient. The scene, GLB normalization, and pointer layers can only be trusted after a real browser pass.

## 1. Static gates

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: zero TypeScript errors, zero ESLint warnings, 14 passing store tests, a clean Vite build. `dist/` is generated and ignored.

## 2. Start a clean preview

```bash
npm run preview -- --port 4183
```

Use an explicit port. If the port is busy, Vite silently moves to another one and you may end up testing a different project. Confirm the page title is **Moss & Ember**.

## 3. Headless visual and interaction pass

The repository includes `docs/qa/visual-check.mjs`. It expects `puppeteer-core` outside the app and Chrome installed.

```bash
mkdir -p /tmp/moss-ember-qa && cd /tmp/moss-ember-qa
npm init -y >/dev/null
npm i puppeteer-core@23 --no-audit --no-fund

cp /path/to/moss-and-ember/docs/qa/visual-check.mjs .
BASE_URL=http://localhost:4183 OUT_DIR="$PWD/shots" node visual-check.mjs
```

The script seeds a rich courtyard, then verifies:

- all GLBs decode without console/page errors;
- the task checkbox pays exactly the tier reward;
- a shop purchase deducts coins and increases inventory;
- selecting a hotbar item and clicking empty grid space adds a placed piece and decrements stock;
- the state survives a reload;
- four screenshots are written: `hero-day`, `hero-night`, `ui-day`, `shop`.

Run it at `1440×900`; the default viewport is set in the script.

## 4. Manual interaction checklist

| Check | Expected |
| --- | --- |
| Complete a Quick task | +10 coins, chime, toast, checkbox locks |
| Complete it again | No reward, no state change |
| Open shop with `B` | Modal, coin total, base/prop tabs |
| Buy an unaffordable item | Button disabled and label shows the shortfall |
| Buy an affordable item | Coins fall, inventory rises, toast |
| Select a base tile | Ghost appears, valid cells are green |
| Hover an occupied base cell | Ghost turns coral |
| Place a prop with no base | Coral ghost and “needs a base tile” toast |
| Place a prop on a base | Piece sits flush at `y = 0.35` |
| Place a second prop on the same cell | Rejected |
| Right-click a prop | Returns to inventory with a bounce |
| Right-click a base with a prop on it | Rejected with “Store the surface prop first.” |
| Press `R` | Ghost rotates 90°, persists while selecting |
| Press `1–9` | Selects the corresponding owned item |
| Press `Esc` | Cancels selection/store mode or closes the shop |
| Press `H` | HUD hides; press again or click “Show interface” |
| Toggle night | Warm lantern/firepoint lights, bloom, stars, dark sky |
| Reset camera | Returns to the reference framing |
| Reload | Coins, tasks, inventory, placed pieces, theme survive |
| Corrupt localStorage | App falls back safely, no render crash |

## 5. Visual checks

Look for:

- No floating props or visible gap above base tiles.
- No z-fighting between adjacent base tiles, water, and ghost plane.
- Lantern and firepot emission is visible at night but does not wash out the whole screen.
- Day shadows read warm; night shadows read cool but not black.
- The diorama is not hidden by the task drawer or hotbar.
- The hotbar shows owned stock counts; empty slots are dashed, not broken.
- The grid fades toward the horizon and does not look like clipped text at the top edge.
- Text is legible on the glass panels at 100% zoom.

## 6. State sanity

In DevTools:

```js
JSON.parse(localStorage.getItem('moss-and-ember-v1'))
```

Confirm:

- persisted keys are exactly `coins`, `tasks`, `inventory`, `placedItems`, `themeMode`;
- no transient fields (`selectedItemId`, `rotation`, `storeMode`) are stored;
- placed cells are unique per layer;
- every prop has a matching base cell.

## 7. Release gate

- [ ] All static gates pass.
- [ ] Visual script passes with zero console errors.
- [ ] All 13 GLBs load (no fallback labels visible).
- [ ] Screenshots refreshed and committed.
- [ ] README links resolve.
- [ ] No secrets, `dist/`, `node_modules/`, or `*.blend1`.
- [ ] `STATE.md` updated with the final session snapshot.
