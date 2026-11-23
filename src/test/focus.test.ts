import { describe, expect, it } from 'vitest';
import {
  clampFocusValue,
  DEFAULT_FOCUS_CONFIG,
  formatClock,
  nextPomodoroStep,
  totalSecondsFor,
} from '../lib/focus';

describe('focus helpers', () => {
  it('formats clock values', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(25 * 60)).toBe('25:00');
  });

  it('clamps session values to sensible bounds', () => {
    expect(clampFocusValue(0, 1, 180, 25)).toBe(1);
    expect(clampFocusValue(900, 1, 180, 25)).toBe(180);
    expect(clampFocusValue(Number.NaN, 1, 180, 25)).toBe(25);
  });

  it('calculates normal and pomodoro durations', () => {
    expect(totalSecondsFor('normal', 'work', DEFAULT_FOCUS_CONFIG)).toBe(1500);
    expect(totalSecondsFor('pomodoro', 'work', DEFAULT_FOCUS_CONFIG)).toBe(1500);
    expect(totalSecondsFor('pomodoro', 'break', DEFAULT_FOCUS_CONFIG)).toBe(300);
  });

  it('walks through pomodoro work and break phases', () => {
    expect(nextPomodoroStep('work', 1, 2)).toEqual({
      phase: 'break',
      block: 1,
      done: false,
    });
    expect(nextPomodoroStep('break', 1, 2)).toEqual({
      phase: 'work',
      block: 2,
      done: false,
    });
    expect(nextPomodoroStep('work', 2, 2)).toEqual({
      phase: 'work',
      block: 2,
      done: true,
    });
  });
});
