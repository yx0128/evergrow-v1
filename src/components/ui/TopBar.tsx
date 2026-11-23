import {
  EyeOff,
  Feather,
  Sparkles,
  Grid2x2X,
  Grid3x3,
  Moon,
  Music2,
  RotateCcw,
  Sun,
  Timer,
} from 'lucide-react';
import { formatClock } from '../../lib/focus';
import type { GraphicsQuality, ThemeMode } from '../../types';

interface TopBarProps {
  themeMode: ThemeMode;
  graphicsQuality: GraphicsQuality;
  gridVisible: boolean;
  onToggleTheme: () => void;
  onToggleGraphicsQuality: () => void;
  onResetCamera: () => void;
  onToggleGrid: () => void;
  onHideUI: () => void;
  onOpenAudio: () => void;
  onOpenFocus: () => void;
  audioActive: boolean;
  focusActive: boolean;
  focusRemaining: number | null;
  focusOnBreak: boolean;
}

export function TopBar({
  themeMode,
  graphicsQuality,
  gridVisible,
  onToggleTheme,
  onToggleGraphicsQuality,
  onResetCamera,
  onToggleGrid,
  onHideUI,
  onOpenAudio,
  onOpenFocus,
  audioActive,
  focusActive,
  focusRemaining,
  focusOnBreak,
}: TopBarProps) {
  const day = themeMode === 'day';
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-2">
      <div className="glass-pill pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
        <button
          type="button"
          onClick={onToggleTheme}
          className="hud-icon focus-ring"
          aria-label={day ? 'Switch to night mode' : 'Switch to day mode'}
          title={day ? 'Night mode' : 'Day mode'}
        >
          {day ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        <button
          type="button"
          onClick={onToggleGraphicsQuality}
          className="hud-icon focus-ring"
          aria-label={`Graphics quality: ${graphicsQuality}. Switch to ${graphicsQuality === 'high' ? 'low' : 'high'}.`}
          title={graphicsQuality === 'high' ? 'Low quality' : 'High quality'}
        >
          {graphicsQuality === 'high' ? (
            <Feather size={15} />
          ) : (
            <Sparkles size={15} />
          )}
        </button>

        <button
          type="button"
          onClick={onResetCamera}
          className="hud-icon focus-ring"
          aria-label="Reset camera"
          title="Reset camera"
        >
          <RotateCcw size={15} />
        </button>

        <button
          type="button"
          onClick={onToggleGrid}
          className="hud-icon focus-ring"
          aria-label={gridVisible ? 'Hide grid' : 'Show grid'}
          aria-pressed={gridVisible}
          title={gridVisible ? 'Hide grid' : 'Show grid'}
        >
          {gridVisible ? <Grid2x2X size={15} /> : <Grid3x3 size={15} />}
        </button>

        <button
          type="button"
          onClick={onHideUI}
          className="hud-icon focus-ring"
          aria-label="Hide interface for photo mode"
          title="Hide interface"
        >
          <EyeOff size={15} />
        </button>
      </div>

      <div className="glass-pill pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
        <button
          type="button"
          onClick={onOpenAudio}
          className="hud-icon focus-ring"
          data-active={audioActive}
          aria-label="Open sound player"
          aria-pressed={audioActive}
          title="Music & ambience"
        >
          <Music2 size={15} />
        </button>
        <button
          type="button"
          onClick={onOpenFocus}
          className={`focus-ring ${
            focusRemaining !== null
              ? focusOnBreak
                ? 'flex h-8 items-center gap-1 rounded-full bg-gold/25 px-2 text-[11px] font-semibold tabular-nums text-gold-deep transition hover:bg-gold/40'
                : 'flex h-8 items-center gap-1 rounded-full bg-sage/15 px-2 text-[11px] font-semibold tabular-nums text-sage-deep transition hover:bg-sage/25'
              : 'hud-icon'
          }`}
          data-active={focusActive}
          aria-label={
            focusRemaining !== null
              ? `Focus session, ${formatClock(focusRemaining)} remaining`
              : 'Open focus session'
          }
          aria-pressed={focusActive}
          title={
            focusRemaining !== null
              ? `${focusOnBreak ? 'Break' : 'Focus'} · ${formatClock(focusRemaining)} remaining`
              : 'Focus session'
          }
        >
          <Timer size={15} />
          {focusRemaining !== null ? (
            <span>{formatClock(focusRemaining)}</span>
          ) : null}
        </button>
      </div>
    </div>
  );
}


