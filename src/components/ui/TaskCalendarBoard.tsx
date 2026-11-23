import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  dayTitle,
  monthCells,
  monthTitle,
  shiftMonth,
  shiftWeek,
  weekCells,
  weekTitle,
  weekdayShort,
} from '../../lib/calendar';
import { formatDueDate, todayIso } from '../../lib/dates';
import { orderTasks } from '../../lib/tasks';
import { playSound } from '../../lib/sound';
import type { Task, TaskPriority } from '../../types';
import type { ToastTone } from '../../types-ui';
import { TaskRow } from './TaskRow';

export type TaskCalendarView = 'month' | 'week' | 'day';

interface TaskCalendarBoardProps {
  view: TaskCalendarView;
  cursor: string;
  tasks: Task[];
  onCursorChange: (date: string) => void;
  onViewChange: (view: TaskCalendarView) => void;
  onToggle: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onToast: (message: string, tone: ToastTone) => void;
  onMoveTask: (taskId: string, dueDate: string) => void;
  fill?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-terracotta',
  medium: 'bg-gold',
  low: 'bg-sage',
};

function TaskChip({
  task,
  date,
  dragging,
  onOpenDay,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  date: string;
  dragging: boolean;
  onOpenDay: (date: string) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={(event) => {
        event.stopPropagation();
        onOpenDay(date);
      }}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      className={`flex min-w-0 cursor-grab items-center gap-1 rounded px-1 py-0.5 text-left text-[9.5px] leading-tight transition active:cursor-grabbing ${
        dragging ? 'opacity-40' : ''
      } ${task.done ? 'bg-sage/10 text-ink-soft/55' : 'bg-white/75 text-ink hover:bg-white'}`}
      title="Drag to change the due date"
      aria-label={`${task.title}${task.done ? ' (done)' : ''}, drag to change the due date`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
      <span className={`truncate ${task.done ? 'line-through' : ''}`}>{task.title}</span>
    </button>
  );
}

export function TaskCalendarBoard({
  view,
  cursor,
  tasks,
  onCursorChange,
  onViewChange,
  onToggle,
  onPin,
  onDelete,
  onToast,
  onMoveTask,
  fill = false,
}: TaskCalendarBoardProps) {
  const today = todayIso();
  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);
  const unscheduled = tasks.filter((task) => !task.dueDate).length;
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);

  function startDrag(taskId: string) {
    setDraggingId(taskId);
    playSound('ui');
  }

  function endDrag() {
    setDraggingId(null);
    setDropDate(null);
  }

  function dragOverDate(event: React.DragEvent<HTMLDivElement>, date: string) {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropDate !== date) setDropDate(date);
  }

  function dropOnDate(event: React.DragEvent<HTMLDivElement>, date: string) {
    event.preventDefault();
    if (draggingId) onMoveTask(draggingId, date);
    endDrag();
  }

  function dragLeaveDate(event: React.DragEvent<HTMLDivElement>, date: string) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDropDate((current) => (current === date ? null : current));
  }

  const title =
    view === 'month' ? monthTitle(cursor) : view === 'week' ? weekTitle(cursor) : dayTitle(cursor);
  const monthGrid = view === 'month' ? monthCells(cursor) : [];
  const weekRow = view === 'week' ? weekCells(cursor) : [];

  function shift(delta: number) {
    if (view === 'month') onCursorChange(shiftMonth(cursor, delta));
    else if (view === 'week') onCursorChange(shiftWeek(cursor, delta));
    else onCursorChange(addDays(cursor, delta));
    playSound('ui');
  }

  function openDay(date: string) {
    onCursorChange(date);
    onViewChange('day');
    playSound('ui');
  }

  return (
    <div
      data-testid="task-calendar-board"
      className={`rounded-2xl border border-ink/10 bg-white/30 p-3 ${
        fill ? 'flex min-h-0 flex-1 flex-col' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="hud-icon focus-ring !h-7 !w-7"
          aria-label={`Previous ${view}`}
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays size={13} className="shrink-0 text-sage-deep" />
          <span className="truncate text-[12px] font-semibold text-ink">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              onCursorChange(today);
              playSound('ui');
            }}
            className="focus-ring rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-sage-deep transition hover:bg-sage/15"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="hud-icon focus-ring !h-7 !w-7"
            aria-label={`Next ${view}`}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="pb-0.5 text-center text-[8.5px] font-bold uppercase tracking-wide text-ink-soft/55"
            >
              {day.slice(0, 3)}
            </span>
          ))}
          {monthGrid.map((date, index) => {
            if (!date) return <span key={`empty-${index}`} />;
            const dayTasks = orderTasks(byDate.get(date) ?? []);
            return (
              <div
                key={date}
                role="button"
                tabIndex={0}
                onClick={() => openDay(date)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDay(date);
                  }
                }}
                onDragOver={(event) => dragOverDate(event, date)}
                onDragLeave={(event) => dragLeaveDate(event, date)}
                onDrop={(event) => dropOnDate(event, date)}
                className={`flex min-h-[76px] min-w-0 cursor-pointer flex-col gap-0.5 rounded-lg border p-1 text-left transition ${
                  dropDate === date ? 'border-sage-deep bg-sage/15 ring-2 ring-sage-deep/40' : ''
                } ${
                  date === today
                    ? 'border-sand/60 bg-sand/15 hover:bg-sand/25'
                    : 'border-ink/8 bg-white/40 hover:border-sage/35 hover:bg-white/70'
                }`}
                aria-label={`Open ${date}${dayTasks.length > 0 ? `, ${dayTasks.length} tasks` : ''}`}
              >
                <span
                  className={`text-[9.5px] font-bold ${
                    date === today ? 'text-terracotta-deep' : 'text-ink-soft/75'
                  }`}
                >
                  {Number(date.slice(-2))}
                </span>
                {dayTasks.slice(0, 2).map((task) => (
                  <TaskChip
                    key={task.id}
                    task={task}
                    date={date}
                    dragging={draggingId === task.id}
                    onOpenDay={openDay}
                    onDragStart={startDrag}
                    onDragEnd={endDrag}
                  />
                ))}
                {dayTasks.length > 2 ? (
                  <span className="pl-1 text-[8.5px] font-semibold text-sage-deep">
                    +{dayTasks.length - 2} more
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : view === 'week' ? (
        <div className={`grid grid-cols-7 gap-1 ${fill ? 'min-h-0 flex-1' : ''}`}>
          {weekRow.map((date) => {
            const dayTasks = orderTasks(byDate.get(date) ?? []);
            return (
              <div
                key={date}
                role="button"
                tabIndex={0}
                onClick={() => openDay(date)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDay(date);
                  }
                }}
                onDragOver={(event) => dragOverDate(event, date)}
                onDragLeave={(event) => dragLeaveDate(event, date)}
                onDrop={(event) => dropOnDate(event, date)}
                className={`flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg border p-1 text-left transition ${
                  fill ? 'h-full min-h-0 overflow-y-auto' : 'min-h-[150px]'
                } ${
                  dropDate === date ? 'border-sage-deep bg-sage/15 ring-2 ring-sage-deep/40' : ''
                } ${
                  date === today
                    ? 'border-sand/60 bg-sand/15 hover:bg-sand/25'
                    : 'border-ink/8 bg-white/40 hover:border-sage/35 hover:bg-white/70'
                }`}
                aria-label={`Open ${date}${dayTasks.length > 0 ? `, ${dayTasks.length} tasks` : ''}`}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="text-[8px] font-bold uppercase text-ink-soft/55">
                    {weekdayShort(date)}
                  </span>
                  <span
                    className={`text-[9.5px] font-bold ${
                      date === today ? 'text-terracotta-deep' : 'text-ink-soft/75'
                    }`}
                  >
                    {Number(date.slice(-2))}
                  </span>
                </span>
                {dayTasks.slice(0, 4).map((task) => (
                  <TaskChip
                    key={task.id}
                    task={task}
                    date={date}
                    dragging={draggingId === task.id}
                    onOpenDay={openDay}
                    onDragStart={startDrag}
                    onDragEnd={endDrag}
                  />
                ))}
                {dayTasks.length > 4 ? (
                  <span className="pl-1 text-[8.5px] font-semibold text-sage-deep">
                    +{dayTasks.length - 4} more
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={fill ? 'flex min-h-0 flex-1 flex-col' : ''}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10.5px] font-semibold text-ink-soft/80">
              {formatDueDate(cursor)}
            </span>
            <button
              type="button"
              onClick={() => onCursorChange(today)}
              className="focus-ring rounded-full bg-white/55 px-2 py-0.5 text-[9.5px] font-semibold text-sage-deep transition hover:bg-white/85"
            >
              Jump to today
            </button>
          </div>
          {(byDate.get(cursor) ?? []).length > 0 ? (
            <ul
              className={`flex flex-col gap-1.5 ${
                fill ? 'panel-scroll min-h-0 flex-1 overflow-y-auto pr-1' : ''
              }`}
            >
              {orderTasks(byDate.get(cursor) ?? []).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onPin={onPin}
                  onDelete={onDelete}
                  onToast={onToast}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-sage/35 px-4 py-8 text-center">
              <p className="font-display text-[13.5px] text-ink">Nothing due this day.</p>
              <p className="pt-1 text-[10.5px] text-ink-soft/75">
                Pick another day or add a deadline to a task.
              </p>
            </div>
          )}
        </div>
      )}

      {unscheduled > 0 ? (
        <p className="pt-2 text-[9.5px] font-semibold text-ink-soft/65">
          {unscheduled} task{unscheduled === 1 ? '' : 's'} have no due date. Use the No due date filter in the list.
        </p>
      ) : null}
    </div>
  );
}
