export type FocusMode = 'normal' | 'pomodoro';
export type FocusPhase = 'work' | 'break';

export interface FocusConfig {
  normalMinutes: number;
  workMinutes: number;
  breakMinutes: number;
  blocks: number;
}

export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  normalMinutes: 25,
  workMinutes: 25,
  breakMinutes: 5,
  blocks: 4,
};

export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 180;
export const MAX_FOCUS_BLOCKS = 12;

export function clampFocusValue(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function totalSecondsFor(
  mode: FocusMode,
  phase: FocusPhase,
  config: FocusConfig,
): number {
  if (mode === 'normal') return config.normalMinutes * 60;
  return (phase === 'work' ? config.workMinutes : config.breakMinutes) * 60;
}

export interface PomodoroStep {
  phase: FocusPhase;
  block: number;
  done: boolean;
}

export function nextPomodoroStep(
  phase: FocusPhase,
  block: number,
  blocks: number,
): PomodoroStep {
  if (phase === 'work') {
    if (block >= blocks) return { phase, block, done: true };
    return { phase: 'break', block, done: false };
  }
  return { phase: 'work', block: block + 1, done: false };
}
