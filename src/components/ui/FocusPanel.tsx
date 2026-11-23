import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, RotateCcw, SkipForward, Timer, X } from 'lucide-react';
import { formatClock, type FocusMode } from '../../lib/focus';
import type { FocusSessionApi } from '../../hooks/useFocusSession';

interface FocusPanelProps {
  open: boolean;
  session: FocusSessionApi;
  onClose: () => void;
}

const MODES: Array<{ id: FocusMode; label: string }> = [
  { id: 'normal', label: 'Normal focus' },
  { id: 'pomodoro', label: 'Pomodoro' },
];

export function FocusPanel({ open, session, onClose }: FocusPanelProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const onBreak =
    session.mode === 'pomodoro' && session.phase === 'break' && !session.finished;
  const status = session.finished
    ? 'Session complete'
    : session.mode === 'normal'
      ? session.running
        ? 'Focusing'
        : 'Ready when you are'
      : session.running
        ? `${session.phase === 'work' ? 'Focus' : 'Break'} · Block ${session.block} of ${session.config.blocks}`
        : `Ready · Block ${session.block} of ${session.config.blocks}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close focus session"
      />
      <div className="glass-panel relative w-full max-w-md animate-panel-in rounded-[28px] p-5 shadow-panel">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sage-deep">
              <Timer size={12} />
              Focus
            </p>
            <h2 id="focus-title" className="mt-0.5 font-display text-[21px] leading-tight text-ink">
              A quiet block of time
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hud-icon focus-ring !h-8 !w-8"
            aria-label="Close focus session"
          >
            <X size={16} />
          </button>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-1.5">
          {MODES.map((entry) => {
            const active = session.mode === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => session.setMode(entry.id)}
                className={`focus-ring rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? 'bg-sage-deep text-ivory shadow-float'
                    : 'bg-white/50 text-ink-soft hover:bg-white/80 hover:text-ink'
                }`}
                aria-pressed={active}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/45 px-4 py-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft/70">
            {status}
          </p>
          <p
            className={`mt-1 font-display text-[46px] leading-none tracking-tight tabular-nums ${
              onBreak ? 'text-gold-deep' : 'text-sage-deep'
            }`}
          >
            {formatClock(session.remaining)}
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                onBreak
                  ? 'bg-gradient-to-r from-gold to-gold-deep'
                  : 'bg-gradient-to-r from-sage to-sage-deep'
              }`}
              style={{ width: `${session.progress}%` }}
            />
          </div>
          {session.mode === 'pomodoro' ? (
            <div className="mt-2 flex items-center justify-center gap-1">
              {Array.from({ length: session.config.blocks }, (_, index) => {
                const current = index + 1 === session.block;
                const done = index + 1 < session.block || session.finished;
                return (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      current
                        ? 'w-4 bg-sage-deep'
                        : done
                          ? 'w-1.5 bg-sage'
                          : 'w-1.5 bg-ink/15'
                    }`}
                    aria-hidden
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={session.running ? session.pause : session.start}
            className="focus-ring flex h-11 min-w-[132px] items-center justify-center gap-1.5 rounded-full bg-sage-deep px-5 text-[12px] font-bold text-ivory shadow-float transition hover:bg-moss active:scale-95"
          >
            {session.running ? <Pause size={15} /> : <Play size={15} />}
            {session.running ? 'Pause' : session.finished ? 'Start again' : 'Start'}
          </button>
          {session.mode === 'pomodoro' ? (
            <button
              type="button"
              onClick={session.skip}
              className="hud-button focus-ring !h-10 !rounded-full !border !border-ink/10 !px-3"
              aria-label="Skip to the next phase"
              title="Skip phase"
            >
              <SkipForward size={14} />
              Skip
            </button>
          ) : null}
          <button
            type="button"
            onClick={session.reset}
            className="hud-icon focus-ring !h-10 !w-10"
            aria-label="Reset timer"
            title="Reset"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-ink/10 bg-white/30 p-3">
          <p className="pb-1.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-soft/70">
            Session length
          </p>
          {session.mode === 'normal' ? (
            <label className="flex items-center justify-between gap-2 text-[11px] font-semibold text-ink-soft">
              Minutes
              <input
                type="number"
                min={1}
                max={180}
                value={session.config.normalMinutes}
                disabled={session.running}
                onChange={(event) =>
                  session.updateConfig({
                    normalMinutes: session.clampMinutes(
                      Number(event.target.value),
                      session.config.normalMinutes,
                    ),
                  })
                }
                className="focus-ring w-20 rounded-lg border border-ink/10 bg-ivory/100 px-2 py-1 text-[12px] text-ink disabled:opacity-40"
                aria-label="Normal focus minutes"
              />
            </label>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 text-[9.5px] font-semibold text-ink-soft/80">
                Focus
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={session.config.workMinutes}
                  disabled={session.running}
                  onChange={(event) =>
                    session.updateConfig({
                      workMinutes: session.clampMinutes(
                        Number(event.target.value),
                        session.config.workMinutes,
                      ),
                    })
                  }
                  className="focus-ring w-full rounded-lg border border-ink/10 bg-ivory/100 px-2 py-1 text-[12px] text-ink disabled:opacity-40"
                  aria-label="Pomodoro focus minutes"
                />
              </label>
              <label className="flex flex-col gap-1 text-[9.5px] font-semibold text-ink-soft/80">
                Break
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={session.config.breakMinutes}
                  disabled={session.running}
                  onChange={(event) =>
                    session.updateConfig({
                      breakMinutes: session.clampMinutes(
                        Number(event.target.value),
                        session.config.breakMinutes,
                      ),
                    })
                  }
                  className="focus-ring w-full rounded-lg border border-ink/10 bg-ivory/100 px-2 py-1 text-[12px] text-ink disabled:opacity-40"
                  aria-label="Pomodoro break minutes"
                />
              </label>
              <label className="flex flex-col gap-1 text-[9.5px] font-semibold text-ink-soft/80">
                Blocks
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={session.config.blocks}
                  disabled={session.running}
                  onChange={(event) =>
                    session.updateConfig({
                      blocks: session.clampBlocks(Number(event.target.value)),
                    })
                  }
                  className="focus-ring w-full rounded-lg border border-ink/10 bg-ivory/100 px-2 py-1 text-[12px] text-ink disabled:opacity-40"
                  aria-label="Pomodoro blocks"
                />
              </label>
            </div>
          )}
          <p className="pt-2 text-[9.5px] leading-snug text-ink-soft/65">
            The timer keeps running while this panel is closed.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
