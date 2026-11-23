import { parseIsoDate, toIsoDate } from './dates';

export function addDays(iso: string, delta: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
}

export function shiftMonth(iso: string, delta: number): string {
  const date = parseIsoDate(iso);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth() + delta, 1));
}

export function shiftWeek(iso: string, delta: number): string {
  return addDays(iso, delta * 7);
}

export function monthCells(cursor: string): Array<string | null> {
  const date = parseIsoDate(cursor);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(toIsoDate(new Date(date.getFullYear(), date.getMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function weekCells(cursor: string): string[] {
  const date = parseIsoDate(cursor);
  const start = addDays(cursor, -date.getDay());
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthTitle(cursor: string): string {
  return parseIsoDate(cursor).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function weekTitle(cursor: string): string {
  const cells = weekCells(cursor);
  const start = parseIsoDate(cells[0]).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const end = parseIsoDate(cells[6]).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `${start} – ${end}`;
}

export function dayTitle(cursor: string): string {
  return parseIsoDate(cursor).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function weekdayShort(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, { weekday: 'short' });
}
