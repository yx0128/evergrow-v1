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

Expected: zero TypeScript errors, zero ESLint warnings, 24 passing store tests, a clean Vite build. `dist/` is generated and ignored.

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
- clicking a placed prop selects it in place, HUD Rotate reorients it, and Move lifts it;
- clicking a valid base drops a lifted prop without changing stock;
- the state and the moved piece survive a reload;
- the High/Low graphics toggle persists and low mode renders without post-processing;
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
| Place a prop on a base | Piece sits flush at `y = 0.2333` |
| Place a second prop on the same cell | Rejected |
| Click a placed prop | Selects it in place; sage tint + selection pill; item does not follow the mouse |
| HUD Rotate / `R` on a selected prop | Rotates in place; coordinates unchanged |
| HUD Rotate / `R` on a selected base with a prop | Both rotate; neither moves |
| Click **Move** or press `M` | Lifts the selected piece into a move ghost |
| Click a valid empty base | Prop moves there; inventory is unchanged |
| Move a base with a prop | Both move together |
| Try an invalid destination | Move stays active; `Esc` or cancel returns it to selection |
| Right-click a prop | Returns to inventory with a bounce |
| Right-click a base with a prop on it | Rejected with “Store the surface prop first.” |
| Press `R` | Placement ghost rotates 90°, persists while selecting |
| Press `R` or HUD **Rotate** while moving | Lifted piece (and its prop) rotates 90°; dropping persists it |
| Press `1–9` | Selects the matching owned item on the current page |
| Press `[` / `]` | Pages the hotbar without changing slot identities |
| Click a zero-stock slot | Opens the shop focused on that item |
| Buy an overflow item | Its fixed page is revealed; no owned item is hidden |
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
- The hotbar shows fixed slots with owned stock counts; zero-stock slots are dashed and open the shop.
- The task drawer stops above the hotbar at 1440 and 1280 with a long task list.
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
- [ ] Repeated tiles/props are instanced and still respond to click/selection/rotation/move/store.
- [ ] The point-light count is fixed at ten; night assigns the nearest ten lights and day sets all to zero.
- [ ] Low quality does not request the post-processing chunk and renders at the lower DPR/shadow size.
- [ ] High-quality tile, prop, and backdrop colors match Low (same ACES mode, no AO/grading/vignette, transparent Canvas over CSS backdrop).
- [ ] Lantern panels and firepot flames are warm golden yellow in day/night and High/Low; coals remain orange.
- [ ] Switching to night keeps lanterns/firepots visible and glowing.
- [ ] Lanterns/firepots still bloom and High keeps 2048² shadows; Low stays at 1024².
- [ ] Screenshots refreshed and committed.
- [ ] README links resolve.
- [ ] No secrets, `dist/`, `node_modules/`, or `*.blend1`.
- [ ] `STATE.md` updated with the final session snapshot.
