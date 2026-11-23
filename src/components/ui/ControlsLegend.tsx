import { useState } from 'react';
import { ChevronDown, Keyboard } from 'lucide-react';

const ROWS: Array<[string, string]> = [
  ['Left click', 'Place selected item'],
  ['Left drag', 'Pan on empty space'],
  ['Click piece', 'Select (stays put)'],
  ['Right drag', 'Orbit camera'],
  ['Middle drag', 'Pan camera'],
  ['Right click', 'Store a piece'],
  ['R', 'Rotate placement / selection'],
  ['M', 'Move selected piece'],
  ['Esc', 'Cancel / deselect'],
  ['Grip · ↑/↓', 'Reorder tasks'],
  ['1–9', 'Select category slot'],
  ['[ / ]', 'Previous / next category'],
  ['B', 'Open build shop'],
  ['H', 'Photo mode'],
];

export function ControlsLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden lg:block">
      {open ? (
        <div className="glass-pill pointer-events-auto w-[208px] rounded-2xl px-3 py-2.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring -mx-1 flex w-full items-center gap-1.5 rounded-lg px-1 pb-1.5 text-left text-[9px] font-bold uppercase tracking-[0.16em] text-ink-soft/80 transition hover:text-ink"
            aria-expanded="true"
            aria-controls="controls-legend-body"
            title="Collapse controls"
          >
            <Keyboard size={11} />
            <span>Controls</span>
            <ChevronDown size={11} className="ml-auto" />
          </button>
          <div id="controls-legend-body">
            <ul className="space-y-1">
              {ROWS.map(([key, action]) => (
                <li key={key} className="flex items-center justify-between gap-2">
                  <span className="rounded bg-white/60 px-1 py-0.5 font-mono text-[9.5px] font-semibold text-ink-soft">
                    {key}
                  </span>
                  <span className="text-right text-[10px] leading-tight text-ink-soft">
                    {action}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glass-pill pointer-events-auto focus-ring flex items-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-semibold text-ink-soft shadow-float transition hover:-translate-y-0.5 hover:text-ink"
          aria-label="Show controls"
          aria-expanded="false"
          aria-controls="controls-legend-body"
          title="Show controls"
        >
          <Keyboard size={15} />
        </button>
      )}
    </div>
  );
}
