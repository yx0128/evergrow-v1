import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  formatDueDate,
  normalizeDateRange,
  parseIsoDate,
  toIsoDate,
  todayIso,
  type DateRange,
} from '../../lib/dates';
import { playSound } from '../../lib/sound';
import type { Task } from '../../types';

interface TaskCalendarProps {
  tasks: Task[];
  selectedRange: DateRange | null;
  onSelectRange: (range: DateRange | null) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function TaskCalendar({
  tasks,
  selectedRange,
  onSelectRange,
}: TaskCalendarProps) {
  const today = todayIso();
  const initial = parseIsoDate(selectedRange?.start ?? today);
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [draggingAnchor, setDraggingAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (!draggingAnchor) return;
    const stop = () => setDraggingAnchor(null);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [draggingAnchor]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      map.set(task.dueDate, (map.get(task.dueDate) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const offset = first.getDay();
    const list: Array<string | null> = Array.from({ length: offset }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(toIsoDate(new Date(cursor.year, cursor.month, day)));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [cursor]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );

  const rangeLabel = selectedRange
    ? selectedRange.start === selectedRange.end
      ? `Showing ${formatDueDate(selectedRange.start)}`
      : `${formatDueDate(selectedRange.start)} – ${formatDueDate(selectedRange.end)}`
    : 'Click a day, or drag across days';

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
    playSound('ui');
  }

  function pickDay(date: string) {
    setDraggingAnchor(date);
    onSelectRange({ start: date, end: date });
    playSound('ui');
  }

  function extendRange(date: string) {
    if (!draggingAnchor) return;
    onSelectRange(normalizeDateRange(draggingAnchor, date));
  }

  function isInRange(date: string) {
    if (!selectedRange) return false;
    return date >= selectedRange.start && date <= selectedRange.end;
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/35 p-2">
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="hud-icon focus-ring !h-6 !w-6"
          aria-label="Previous month"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="text-[11px] font-semibold text-ink">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="hud-icon focus-ring !h-6 !w-6"
          aria-label="Next month"
        >
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="grid touch-none select-none grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((day, index) => (
          <span
            key={`${day}-${index}`}
            className="text-[8.5px] font-bold uppercase text-ink-soft/55"
          >
            {day}
          </span>
        ))}
        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;
          const count = counts.get(date) ?? 0;
          const isToday = date === today;
          const inRange = isInRange(date);
          const isEndpoint =
            selectedRange &&
            (date === selectedRange.start || date === selectedRange.end);
          return (
            <button
              key={date}
              type="button"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                pickDay(date);
              }}
              onPointerEnter={() => extendRange(date)}
              onClick={(event) => {
                if (event.detail === 0) {
                  setDraggingAnchor(null);
                  onSelectRange({ start: date, end: date });
                  playSound('ui');
                }
              }}
              className={`focus-ring relative flex h-6 flex-col items-center justify-center rounded-md text-[10px] font-semibold transition ${
                isEndpoint
                  ? 'bg-sage-deep text-ivory shadow-float'
                  : inRange
                    ? 'bg-sage/30 text-sage-deep'
                    : isToday
                      ? 'bg-sand/35 text-ink hover:bg-sand/55'
                      : 'text-ink-soft hover:bg-white/70 hover:text-ink'
              }`}
              aria-pressed={Boolean(isEndpoint)}
              aria-label={`${date}${count > 0 ? `, ${count} task${count === 1 ? '' : 's'} due` : ''}`}
            >
              {parseIsoDate(date).getDate()}
              {count > 0 ? (
                <span
                  className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                    isEndpoint ? 'bg-ivory' : 'bg-terracotta'
                  }`}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="truncate text-[9.5px] text-ink-soft/75">{rangeLabel}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const current = parseIsoDate(today);
              setCursor({
                year: current.getFullYear(),
                month: current.getMonth(),
              });
              onSelectRange({ start: today, end: today });
              playSound('ui');
            }}
            className="focus-ring rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-sage-deep transition hover:bg-sage/15"
          >
            Today
          </button>
          {selectedRange ? (
            <button
              type="button"
              onClick={() => {
                onSelectRange(null);
                playSound('ui');
              }}
              className="focus-ring rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-terracotta-deep transition hover:bg-terracotta/10"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
