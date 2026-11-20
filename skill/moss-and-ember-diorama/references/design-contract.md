# Design contract

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Cream | `#F3EFE6` | Day sky / page base |
| Ivory | `#FBF8F1` | Panel highlights |
| Parchment | `#E9E0CF` | Secondary surfaces |
| Sand | `#D9BE8F` | Sandstone |
| Sage | `#93A87B` | Positive UI |
| Sage deep | `#6F8558` | Buttons / progress |
| Moss | `#556B45` | Hover |
| Gold | `#E0B15E` | Coins / lights |
| Terracotta | `#D08A67` | Primary CTA / warnings |
| Rose | `#D98A92` | Blossoms |
| Sky | `#8FC6D8` | Water |
| Slate | `#7E8B99` | Slate / moon shadow |
| Ink | `#3A3730` | Text |
| Night | `#16181D` | Night sky |

No neon, pure white, or pure black. Glass panels stay cream in both themes.

## Layout at 1440×900

- 16px HUD margins.
- Top-left: brand + coins + day/night + reset camera + photo mode.
- Top-right: 370px collapsible task drawer.
- Bottom center: nine 54px hotbar slots + rotate/store/shop.
- Bottom-left: controls legend at `xl` only.
- Diorama framed left/center so the right drawer does not cover it.
- Photo mode hides everything except a “Show interface” pill.

## Camera

- Position `[7.4, 8.4, 9.6]`, target `[0, 0.35, 0]`, fov `32`.
- Low-FOV near-isometric read.
- Right-drag orbit, middle-drag pan, wheel zoom, left click reserved for building.
- Polar clamp `0.2..0.475π`.
- Reset without reload.

## Motion

- Panel in `260ms` cubic-bezier `(0.22, 1, 0.36, 1)`.
- Toast in `240ms`, dismiss after `2.8s`.
- Placement bounce `460ms` ease-out-back using `Date.now()`.
- Leaves sway slowly; no frantic particles.
- Respect `prefers-reduced-motion`.

## Persistence schema

```ts
{
  coins: number,
  tasks: { id, title, tier: 'quick'|'standard'|'deep', done, createdAt, completedAt? }[],
  inventory: Record<itemId, number>,
  placedItems: { id, itemId, x, z, rotation: 0|1|2|3, placedAt }[],
  themeMode: 'day'|'night'
}
```

Key `moss-and-ember-v1`, version `1`. Never persist selection, rotation, store mode, or hydration.

## Copy voice

Short, gentle, concrete. “Store the surface prop first.” not “Invalid operation.” No exclamation marks, no streak pressure.
