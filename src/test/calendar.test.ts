import { describe, expect, it } from 'vitest';
import {
  addDays,
  monthCells,
  shiftMonth,
  shiftWeek,
  weekCells,
} from '../lib/calendar';

describe('calendar helpers', () => {
  it('shifts days, weeks, and months', () => {
    expect(addDays('2026-11-23', 1)).toBe('2026-11-24');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftWeek('2026-11-23', 1)).toBe('2026-11-30');
    expect(shiftMonth('2026-11-23', 1)).toBe('2026-12-01');
  });

  it('builds a Sunday-first month grid and week row', () => {
    const october = monthCells('2026-10-15');
    expect(october[0]).toBeNull();
    expect(october[4]).toBe('2026-10-01');

    const cells = monthCells('2026-11-23');
    expect(cells[0]).toBe('2026-11-01');
    expect(cells[29]).toBe('2026-11-30');
    expect(cells.length % 7).toBe(0);

    const week = weekCells('2026-11-23');
    expect(week[0]).toBe('2026-11-22');
    expect(week[6]).toBe('2026-11-28');
  });
});
