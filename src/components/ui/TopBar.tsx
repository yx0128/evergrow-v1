import { Coins, EyeOff, Gauge, Moon, RotateCcw, Sun } from 'lucide-react';
import type { GraphicsQuality, ThemeMode } from '../../types';

interface TopBarProps {
  coins: number;
  themeMode: ThemeMode;
  graphicsQuality: GraphicsQuality;
  onToggleTheme: () => void;
  onToggleGraphicsQuality: () => void;
  onResetCamera: () => void;
  onHideUI: () => void;
}

export function TopBar({
  coins,
  themeMode,
  graphicsQuality,
  onToggleTheme,
  onToggleGraphicsQuality,
  onResetCamera,
  onHideUI,
}: TopBarProps) {
  const day = themeMode === 'day';
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-2">
      <div className="glass-pill pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
        <div
          className="flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1.5 text-ink"
          title="Coins earned from completed tasks"
        >
          <Coins size={15} className="text-gold-deep" />
          <span
            key={coins}
            className="animate-coin-pop font-display text-[15px] font-semibold tabular-nums leading-none text-ink"
          >
            {coins.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="hud-button focus-ring"
          aria-label={day ? 'Switch to night mode' : 'Switch to day mode'}
          title={day ? 'Night mode' : 'Day mode'}
        >
          {day ? <Moon size={15} /> : <Sun size={15} />}
          <span className="hidden sm:inline">{day ? 'Night' : 'Day'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleGraphicsQuality}
          className="hud-button focus-ring"
          aria-label={`Graphics quality: ${graphicsQuality}. Switch to ${graphicsQuality === 'high' ? 'low' : 'high'}.`}
          title={graphicsQuality === 'high' ? 'High quality — click for Low' : 'Low quality — click for High'}
        >
          <Gauge size={15} />
          <span className="hidden sm:inline">{graphicsQuality === 'high' ? 'High' : 'Low'}</span>
        </button>

        <button
          type="button"
          onClick={onResetCamera}
          className="hud-button focus-ring"
          aria-label="Reset camera"
          title="Reset camera"
        >
          <RotateCcw size={15} />
        </button>

        <button
          type="button"
          onClick={onHideUI}
          className="hud-button focus-ring"
          aria-label="Hide interface for photo mode"
          title="Photo mode — hide interface (H)"
        >
          <EyeOff size={15} />
        </button>
      </div>
    </div>
  );
}
