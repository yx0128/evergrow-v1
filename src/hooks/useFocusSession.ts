import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clampFocusValue,
  DEFAULT_FOCUS_CONFIG,
  MAX_FOCUS_BLOCKS,
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  nextPomodoroStep,
  totalSecondsFor,
  type FocusConfig,
  type FocusMode,
  type FocusPhase,
} from '../lib/focus';
import { playSound } from '../lib/sound';

type FocusToastTone = 'success' | 'info';

interface FocusSessionOptions {
  onEvent?: (message: string, tone: FocusToastTone) => void;
}

export function useFocusSession({ onEvent }: FocusSessionOptions = {}) {
  const [mode, setModeState] = useState<FocusMode>('normal');
  const [config, setConfig] = useState<FocusConfig>(DEFAULT_FOCUS_CONFIG);
  const [phase, setPhase] = useState<FocusPhase>('work');
  const [block, setBlock] = useState(1);
  const [remaining, setRemaining] = useState(
    DEFAULT_FOCUS_CONFIG.normalMinutes * 60,
  );
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endAtRef = useRef<number | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const emit = useCallback((message: string, tone: FocusToastTone) => {
    onEventRef.current?.(message, tone);
  }, []);

  const setMode = useCallback(
    (next: FocusMode) => {
      setModeState(next);
      setRunning(false);
      setFinished(false);
      setPhase('work');
      setBlock(1);
      endAtRef.current = null;
      setRemaining(totalSecondsFor(next, 'work', config));
      playSound('ui');
    },
    [config],
  );

  const updateConfig = useCallback(
    (patch: Partial<FocusConfig>) => {
      const next = { ...config, ...patch };
      setConfig(next);
      if (!running) setRemaining(totalSecondsFor(mode, phase, next));
    },
    [config, mode, phase, running],
  );

  const start = useCallback(() => {
    if (finished) {
      const seconds = totalSecondsFor(mode, 'work', config);
      setPhase('work');
      setBlock(1);
      setFinished(false);
      setRemaining(seconds);
      endAtRef.current = Date.now() + seconds * 1000;
      setRunning(true);
      playSound('ui');
      emit('Starting a fresh focus session.', 'info');
      return;
    }
    if (remaining <= 0) return;
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
    setFinished(false);
    playSound('ui');
    emit('Focus session started.', 'info');
  }, [config, emit, finished, mode, remaining]);

  const pause = useCallback(() => {
    if (!running) return;
    const end = endAtRef.current;
    const next = end
      ? Math.max(0, Math.ceil((end - Date.now()) / 1000))
      : remaining;
    setRemaining(next);
    setRunning(false);
    endAtRef.current = null;
    playSound('ui');
    emit('Focus session paused.', 'info');
  }, [emit, remaining, running]);

  const reset = useCallback(() => {
    setRunning(false);
    setFinished(false);
    setPhase('work');
    setBlock(1);
    endAtRef.current = null;
    setRemaining(totalSecondsFor(mode, 'work', config));
    playSound('ui');
    emit('Focus session reset.', 'info');
  }, [config, emit, mode]);

  const skip = useCallback(() => {
    if (mode === 'normal') {
      setRunning(false);
      setFinished(true);
      setRemaining(0);
      endAtRef.current = null;
      playSound('alarm');
      emit('Focus session finished.', 'success');
      return;
    }
    const step = nextPomodoroStep(phase, block, config.blocks);
    if (step.done) {
      setRunning(false);
      setFinished(true);
      setRemaining(0);
      endAtRef.current = null;
      playSound('alarm');
      emit(`Pomodoro complete. ${config.blocks} blocks done.`, 'success');
      return;
    }
    const seconds = totalSecondsFor('pomodoro', step.phase, config);
    setPhase(step.phase);
    setBlock(step.block);
    setRemaining(seconds);
    setFinished(false);
    if (running) endAtRef.current = Date.now() + seconds * 1000;
    playSound('ui');
    emit(
      step.phase === 'break'
        ? 'Focus block done. Break time.'
        : `Break over. Block ${step.block} of ${config.blocks} begins.`,
      'info',
    );
  }, [block, config, emit, mode, phase, running]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const end = endAtRef.current;
      if (!end) return;
      const next = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(next);
      if (next > 0) return;

      if (mode === 'normal') {
        setRunning(false);
        setFinished(true);
        endAtRef.current = null;
        playSound('alarm');
        emit('Focus session complete. Nice work.', 'success');
        return;
      }

      const step = nextPomodoroStep(phase, block, config.blocks);
      if (step.done) {
        setRunning(false);
        setFinished(true);
        endAtRef.current = null;
        playSound('alarm');
        emit(`Pomodoro complete. ${config.blocks} blocks done.`, 'success');
        return;
      }

      const seconds = totalSecondsFor('pomodoro', step.phase, config);
      setPhase(step.phase);
      setBlock(step.block);
      setRemaining(seconds);
      endAtRef.current = Date.now() + seconds * 1000;
      playSound('alarm');
      emit(
        step.phase === 'break'
          ? 'Focus block complete. Take a break.'
          : `Break over. Block ${step.block} of ${config.blocks} begins.`,
        'info',
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, [block, config, emit, mode, phase, running]);

  const total = totalSecondsFor(mode, phase, config);
  const progress =
    total > 0 ? Math.min(100, Math.max(0, ((total - remaining) / total) * 100)) : 0;

  const clampMinutes = useCallback(
    (value: number, fallback: number) =>
      clampFocusValue(value, MIN_FOCUS_MINUTES, MAX_FOCUS_MINUTES, fallback),
    [],
  );
  const clampBlocks = useCallback(
    (value: number) => clampFocusValue(value, 1, MAX_FOCUS_BLOCKS, 4),
    [],
  );

  return useMemo(
    () => ({
      mode,
      config,
      phase,
      block,
      remaining,
      running,
      finished,
      total,
      progress,
      setMode,
      updateConfig,
      start,
      pause,
      reset,
      skip,
      clampMinutes,
      clampBlocks,
    }),
    [
      mode,
      config,
      phase,
      block,
      remaining,
      running,
      finished,
      total,
      progress,
      setMode,
      updateConfig,
      start,
      pause,
      reset,
      skip,
      clampMinutes,
      clampBlocks,
    ],
  );
}

export type FocusSessionApi = ReturnType<typeof useFocusSession>;
