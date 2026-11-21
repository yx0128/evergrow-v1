# Design contract

Moss & Ember should feel like a quiet tabletop garden at the edge of a window: warm, dimensional, and unhurried. The interface borrows the material language of paper, glass, clay, and stone rather than SaaS chrome.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Cream | `#F3EFE6` | Day sky / page base |
| Ivory | `#FBF8F1` | Glass panel highlights, text on dark |
| Parchment | `#E9E0CF` | Secondary surfaces |
| Sand | `#D9BE8F` | Sandstone, warm accents |
| Sage | `#93A87B` | Primary positive UI, selected states |
| Sage deep | `#6F8558` | Buttons, progress fills |
| Moss | `#556B45` | Button hover / iconography |
| Gold | `#E0B15E` | Coins, rewards, lantern light |
| Terracotta | `#D08A67` | Shop CTAs, warnings, firepot |
| Rose | `#D98A92` | Blossoms, soft highlights |
| Sky | `#8FC6D8` | Water, cool notes |
| Slate | `#7E8B99` | Slate tile, moonlit shadows |
| Ink | `#3A3730` | Primary text |
| Ink soft | `#635E54` | Secondary text |
| Night | `#16181D` | Night sky / backdrop |
| Night soft | `#20242C` | Night panel tint |

Rules:

- No neon, pure white, or pure black. The darkest surface is `#16181D`; the lightest is `#FBF8F1`.
- Coins are always gold; errors and removal are terracotta.
- Use color + shape + label, never color alone.
- Glass panels remain cream in both themes; the world changes behind them.

## Typography

- Display: Georgia / Iowan Old Style / Palatino fallback stack. Used for panel titles and large numbers.
- Sans: Avenir Next / Avenir / Segoe UI / Helvetica Neue. Used for controls and body copy.
- Micro-labels use uppercase tracking `0.12–0.22em` at `9–11px`.
- Numbers in the coin counter use tabular figures to avoid layout jitter.

## Layout at 1440×900

```text
┌──────────────────────────────────────────────────────────────┐
│ [theme · quality · reset · photo]                [task drawer] │
│                                                              │
│                    floating diorama                          │
│                                                              │
│ [controls]                                   [task drawer]   │
│                    [hotbar · rotate · store · shop]          │
│                                              [coin counter]  │
└──────────────────────────────────────────────────────────────┘
```

- HUD margins: `16px`.
- Top-left pill: day/night + High/Low graphics quality + reset camera + photo mode.
- Top-right: task drawer `370px` wide, collapsible to a pill.
- Bottom-right: the single coin counter; the balance is never shown twice.
- Bottom center: hotbar with nine `54px` slots; side controls for rotate/store/shop.
- Bottom-left: controls legend, only above `xl` width.
- The diorama is framed left/center because the task drawer owns the right edge.
- In photo mode the HUD disappears except a small “Show interface” affordance.

## Camera

- Reference: `position [7.4, 8.4, 9.6]`, `target [0, 0.35, 0]`, `fov 32`.
- This is a low-FOV, near-isometric read: tiles stay legible without fisheye distortion.
- Right-drag orbit, middle-drag pan, wheel zoom. Left click is reserved for building.
- Clamp polar angle to `0.2–0.475π` so the floating island never flips under the camera.
- Reset is instant and reversible; it does not reload state.

## Surfaces and depth

- Canvas: alpha-transparent over the wrapper's CSS cream/night so High and Low backdrops match exactly. Panels: cream gradient `92% → 82%`, 18px backdrop blur, 145% saturation, 1px white border, soft green-grey shadow.
- Pills: same material, smaller shadow.
- Inputs: ivory at 85–100% with a 10% ink border.
- Selected hotbar slot lifts `4px` and gains a sage ring. A selected placed piece gets a soft sage cell tint.
- Ghost placement: translucent green (valid) or coral (invalid), `depthWrite: false`, with a faint cell tint beneath.
- Shadows: warm sun in day, cool moon at night. High quality keeps 2048² shadows plus subtle emissive bloom; no AO/grading/vignette, so tile and prop colors stay clean like Low. Lantern glow panels and firepot flames use a deliberately warm golden yellow in both themes and quality modes.

## Motion

- Panel entrance: `260ms` cubic-bezier `(0.22, 1, 0.36, 1)`, 8px rise.
- Toast: `240ms` drop-in, auto-dismiss after `2.8s`.
- Placement: `460ms` ease-out-back bounce driven by `Date.now()`.
- Day mode intentionally has no ambient particles or confetti; motion is limited to the world, UI, and placement bounce.
- Coin counter: a short `340ms` pop on change.
- Respect `prefers-reduced-motion`.

## Economy UX

- Quick / Standard / Deep Work are always visible with their coin value, so the reward is never a surprise.
- Completing a task is one-way; the checkbox becomes a sage check and the row is struck through. This protects the economy and gives a clear “done” moment.
- Purchases go to the hotbar, not directly into the world. The next action is always “select, then click”.
- Store mode is explicit, but right-click storage is always available as a shortcut.
- Click a placed piece to select it in place; it does not follow the mouse. A sage cell tint and a selection pill appear.
- `R` or HUD **Rotate** reorients the selected piece in 90° steps; a selected base rotates its prop too. The HUD buttons are the single source for rotate/store actions.
- HUD **Store** returns the selected piece to inventory. **Move** / `M` lifts the piece. A green ghost previews the destination; the ghost stays visible at its last cell while the pointer is over the HUD. Click a valid cell to drop; `Esc`/cancel returns it to selection. Base tiles carry their surface prop.
- Reset requires a native confirmation and restores the exact starter world.

## Accessibility

- Every icon-only button has an `aria-label` and a `title`.
- Toggles use `aria-pressed`.
- The task input has a visible label via `aria-label` and submits on Enter.
- Focus rings are cream + sage, visible on glass.
- Text contrast stays at or above WCAG AA for body sizes on the cream panel.
- Keyboard coverage: `1–9`, `R`, `B`, `H`, `Esc`, Enter in the task form.
- Selection and moving are click/keyboard-only (no drag requirement), so they work with a trackpad and do not conflict with camera orbit.
- The app is usable without audio; sound is a garnish.

## Copy voice

Short, gentle, concrete. Prefer “Store the surface prop first.” over “Invalid operation.” Prefer “A fresh courtyard is waiting.” over “Reset complete.” No exclamation marks, no growth-hacking language, no streak pressure.
