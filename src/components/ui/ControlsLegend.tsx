import { Keyboard, MousePointerClick } from 'lucide-react';

const ROWS: Array<[string, string]> = [
  ['Left click', 'Place selected item'],
  ['Click piece', 'Select (stays put)'],
  ['Right drag', 'Orbit camera'],
  ['Middle drag', 'Pan camera'],
  ['Right click', 'Store a piece'],
  ['R', 'Rotate placement / selection'],
  ['M', 'Move selected piece'],
  ['Esc', 'Cancel / deselect'],
  ['Grip · ↑/↓', 'Reorder tasks'],
  ['1–9', 'Select current page slot'],
  ['[ / ]', 'Previous / next hotbar page'],
  ['B', 'Open build shop'],
  ['H', 'Photo mode'],
];

export function ControlsLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden w-[208px] xl:block">
      <div className="glass-pill rounded-2xl px-3 py-2.5">
        <div className="flex items-center gap-1.5 pb-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-soft/55">
          <Keyboard size={11} />
          Controls
        </div>
        <ul className="space-y-1">
          {ROWS.map(([key, action]) => (
            <li key={key} className="flex items-center justify-between gap-2">
              <span className="rounded bg-white/60 px-1 py-0.5 font-mono text-[8.5px] font-semibold text-ink-soft/80">
                {key}
              </span>
              <span className="text-right text-[9.5px] leading-tight text-ink-soft/60">
                {action}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1 border-t border-ink/10 pt-1.5 text-[8.5px] leading-tight text-ink-soft/45">
          <MousePointerClick size={10} />
          Coins are earned, never bought.
        </p>
      </div>
    </div>
  );
}
