import { useEffect, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ListTodo,
  Maximize2,
  Minimize2,
  Pin,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { TASK_PRIORITY_LABELS } from '../../data/items';
import { formatDueDate, todayIso, type DateRange } from '../../lib/dates';
import { playSound } from '../../lib/sound';
import { CoinIcon } from './CoinIcon';
import { useWorldStore } from '../../store/useWorldStore';
import { filterTasks, orderTasks } from '../../lib/tasks';
import { TaskCalendar } from './TaskCalendar';
import { TaskCalendarBoard, type TaskCalendarView } from './TaskCalendarBoard';
import { TaskCreateDialog } from './TaskCreateDialog';
import { TaskRow } from './TaskRow';
import type { TaskPriority } from '../../types';

type StatusFilter = 'all' | 'incomplete' | 'completed';
type PriorityFilter = TaskPriority | 'all';
type TabView = 'list' | TaskCalendarView;

const TAB_VIEWS: Array<{ id: TabView; label: string }> = [
  { id: 'list', label: 'List' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];
import type { ToastTone } from '../../types-ui';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

interface TaskDrawerProps {
  open: boolean;
  onToggle: () => void;
  onToast: (message: string, tone: ToastTone) => void;
  onReset?: () => void;
}

export function TaskDrawer({ open, onToggle, onToast, onReset }: TaskDrawerProps) {
  const tasks = useWorldStore((state) => state.tasks);
  const coins = useWorldStore((state) => state.coins);
  const toggleTask = useWorldStore((state) => state.toggleTask);
  const deleteTask = useWorldStore((state) => state.deleteTask);
  const toggleTaskPin = useWorldStore((state) => state.toggleTaskPin);
  const setTaskDueDate = useWorldStore((state) => state.setTaskDueDate);
  const togglePinAllIncompleteTasks = useWorldStore(
    (state) => state.togglePinAllIncompleteTasks,
  );
  const resetWorld = useWorldStore((state) => state.resetWorld);
  const taskLayout = useWorldStore((state) => state.taskLayout);
  const setTaskLayout = useWorldStore((state) => state.setTaskLayout);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tabView, setTabView] = useState<TabView>('list');
  const [calendarCursor, setCalendarCursor] = useState(todayIso());
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [noDueDate, setNoDueDate] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const done = tasks.filter((task) => task.done).length;
  const pending = tasks.length - done;
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;
  const dateQuery = dateRange
    ? dateRange.start === dateRange.end
      ? { date: dateRange.start }
      : { from: dateRange.start, to: dateRange.end }
    : {};
  const filteredTasks = filterTasks(tasks, {
    status: statusFilter,
    priority: priorityFilter,
    noDueDate,
    ...dateQuery,
  });
  const hasFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    Boolean(dateRange) ||
    noDueDate;
  const orderedTasks = orderTasks(filteredTasks);
  const pendingTasks = tasks.filter((task) => !task.done);
  const allPendingPinned =
    pendingTasks.length > 0 && pendingTasks.every((task) => task.pinned);

  function handleToggle(id: string) {
    const result = toggleTask(id);
    if (result.ok) {
      playSound('task');
      onToast(result.message, 'success');
    } else {
      playSound('error');
      onToast(result.message, 'error');
    }
  }

  function handlePin(id: string) {
    const result = toggleTaskPin(id);
    if (result.ok) {
      playSound('ui');
    } else {
      playSound('error');
      onToast(result.message, 'error');
    }
  }

  function handlePinAll() {
    const result = togglePinAllIncompleteTasks();
    if (result.ok) {
      playSound('ui');
    } else {
      playSound('error');
      onToast(result.message, 'error');
    }
  }

  useEffect(() => {
    if (!confirmReset) return;
    const timer = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(timer);
  }, [confirmReset]);

  useEffect(() => {
    if (!open || taskLayout !== 'tab') return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onToggle();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, taskLayout, onToggle]);

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      playSound('ui');
      return;
    }
    resetWorld();
    onReset?.();
    setConfirmReset(false);
    setCreateOpen(false);
    playSound('store');
    onToast('A fresh world is waiting.', 'info');
  }

  function handleMoveTask(taskId: string, dueDate: string) {
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task || task.dueDate === dueDate) return;
    const result = setTaskDueDate(taskId, dueDate);
    if (result.ok) {
      playSound('ui');
      onToast(`Moved “${task.title}” to ${formatDueDate(dueDate)}.`, 'success');
    } else {
      playSound('error');
      onToast(result.message, 'error');
    }
  }

  function changeTabView(next: TabView) {
    setTabView(next);
    if (next !== 'list') {
      setDateRange(null);
      setNoDueDate(false);
    }
    playSound('ui');
  }

  function handleDelete(id: string) {
    const task = tasks.find((entry) => entry.id === id);
    deleteTask(id);
    playSound('ui');
    onToast(task ? `Deleted “${task.title}”.` : 'Task deleted.', 'info');
  }

  if (!open) {
    return (
      <div className="pointer-events-none absolute inset-4 z-30 flex items-start justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setTaskLayout('bar');
            onToggle();
          }}
          className="glass-pill focus-ring pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-float transition hover:-translate-y-0.5"
          aria-label={`Open task bar. ${pending} tasks remaining.`}
          title="Open task bar"
        >
          <ListTodo size={16} className="text-sage-deep" />
          <span className="hidden sm:inline">Tasks</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta/20 px-1.5 text-[10.5px] font-bold text-terracotta-deep">
            {pending}
          </span>
          <span className="hidden items-center gap-1 border-l border-ink/10 pl-2 text-[12.5px] font-semibold text-gold-ink md:flex">
            <CoinIcon size={13} />
            {coins}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTaskLayout('tab');
            onToggle();
          }}
          className="glass-pill focus-ring pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-sage-deep shadow-float transition hover:-translate-y-0.5 hover:text-ink"
          aria-label="Open task tab"
          title="Open task tab"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    );
  }

  const tabLayout = taskLayout === 'tab';
  const showCalendarView = tabLayout && tabView !== 'list';
  const calendarFill = tabLayout && (tabView === 'week' || tabView === 'day');
  const pinAllButton = (
    <button
      type="button"
      onClick={handlePinAll}
      disabled={pendingTasks.length === 0}
      className={`focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${
        allPendingPinned
          ? 'border-terracotta/35 bg-terracotta/20 text-terracotta-deep'
          : 'border-ink/10 bg-white/50 text-terracotta-deep hover:border-terracotta/30 hover:bg-terracotta/15'
      } disabled:cursor-not-allowed disabled:opacity-35`}
      aria-pressed={allPendingPinned}
      aria-label={
        allPendingPinned
          ? 'Unpin all unfinished tasks'
          : 'Pin all unfinished tasks to the top'
      }
      title={
        allPendingPinned
          ? 'Unpin all unfinished tasks'
          : 'Pin all unfinished tasks to the top'
      }
    >
      <Pin size={16} className={allPendingPinned ? 'fill-current' : undefined} />
    </button>
  );

  return (
    <div
      className={
        tabLayout
          ? 'fixed inset-0 z-50 flex items-center justify-center p-4'
          : 'pointer-events-none absolute inset-4 z-30 flex justify-end'
      }
    >
      {tabLayout ? (
        <button
          type="button"
          className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[2px]"
          onClick={onToggle}
          aria-label="Close task tab"
        />
      ) : null}
      <div
        data-testid="task-drawer"
        role={tabLayout ? 'dialog' : undefined}
        aria-modal={tabLayout ? 'true' : undefined}
        aria-label={tabLayout ? 'Tasks' : undefined}
        className={
          tabLayout
            ? 'pointer-events-auto relative flex h-[88vh] max-h-[820px] w-full max-w-4xl flex-col'
            : 'pointer-events-auto flex max-h-[calc(100vh-2rem-var(--hud-dock-space,140px))] w-[min(370px,100%)] flex-col'
        }
      >
      <div
        className={`glass-panel flex min-h-0 animate-panel-in flex-col overflow-hidden rounded-[26px] ${
          tabLayout ? 'h-full' : 'max-h-full'
        }`}
      >
        <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div>
            <h2 className="font-display text-[19px] leading-tight text-ink">
              Tasks
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1.5 text-[13.5px] font-semibold text-gold-ink">
              <CoinIcon size={14} />
              {coins.toLocaleString()}
            </div>
            <button
              type="button"
              onClick={() => {
                const next = tabLayout ? 'bar' : 'tab';
                setTaskLayout(next);
                if (next === 'tab') setCreateOpen(false);
                playSound('ui');
              }}
              className="hud-button focus-ring !px-1.5"
              aria-label={tabLayout ? 'Dock tasks as a side bar' : 'Open tasks as a full tab'}
              title={tabLayout ? 'Dock as side bar' : 'Open as full tab'}
            >
              {tabLayout ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="hud-button focus-ring !px-1.5"
              aria-label={tabLayout ? 'Close task tab' : 'Collapse task list'}
              title={tabLayout ? 'Close' : 'Collapse'}
            >
              {tabLayout ? <X size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </header>

        <div
          className={
            calendarFill
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'panel-scroll min-h-0 flex-1 overflow-y-auto'
          }
        >
        {tabLayout ? null : (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft/90">
              <span>{done} of {tasks.length} done</span>
              <span>{pending} remaining</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sage to-sage-deep transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {tabLayout ? null : (
          <div className="flex items-center gap-2 border-y border-ink/10 bg-white/30 px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(true);
                playSound('ui');
              }}
              className="focus-ring flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-sage-deep px-3 py-2 text-[12px] font-bold text-ivory shadow-float transition hover:bg-moss active:scale-95"
            >
              <Plus size={15} />
              New task
            </button>
            <button
              type="button"
              onClick={handlePinAll}
              disabled={pendingTasks.length === 0}
              className={`focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95 ${
                allPendingPinned
                  ? 'border-terracotta/35 bg-terracotta/20 text-terracotta-deep'
                  : 'border-ink/10 bg-white/50 text-terracotta-deep hover:border-terracotta/30 hover:bg-terracotta/15'
              } disabled:cursor-not-allowed disabled:opacity-35`}
              aria-pressed={allPendingPinned}
              aria-label={
                allPendingPinned
                  ? 'Unpin all unfinished tasks'
                  : 'Pin all unfinished tasks to the top'
              }
              title={
                allPendingPinned
                  ? 'Unpin all unfinished tasks'
                  : 'Pin all unfinished tasks to the top'
              }
            >
              <Pin size={16} className={allPendingPinned ? 'fill-current' : undefined} />
            </button>
          </div>
        )}

        {tabLayout ? (
          <div className="flex items-center gap-1 border-b border-ink/10 px-4 py-2">
            {TAB_VIEWS.map((entry) => {
              const active = tabView === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => changeTabView(entry.id)}
                  className={`focus-ring flex-1 rounded-full px-2 py-1 text-[10.5px] font-semibold transition ${
                    active
                      ? 'bg-sage-deep text-ivory shadow-float'
                      : 'bg-white/45 text-ink-soft hover:bg-white/70'
                  }`}
                  aria-pressed={active}
                >
                  {entry.label}
                </button>
              );
            })}
            {pinAllButton}
          </div>
        ) : null}

        {showCalendarView ? null : (
        <div className="border-b border-ink/10 px-4 py-2">
          <button
            type="button"
            onClick={() => {
              setCalendarOpen((current) => !current);
              playSound('ui');
            }}
            className="focus-ring flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-[10.5px] font-semibold text-ink-soft transition hover:text-ink"
            aria-expanded={calendarOpen}
          >
            <span className="flex items-center gap-1.5">
              <CalendarDays size={12} className="text-sage-deep" />
              Calendar
              {dateRange ? (
                <span className="rounded-full bg-sage/20 px-1.5 text-[9px] font-bold text-sage-deep">
                  filtered
                </span>
              ) : null}
            </span>
            <ChevronDown
              size={12}
              className={`transition-transform ${calendarOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {calendarOpen ? (
            <div className="pt-1.5">
              <TaskCalendar
                tasks={tasks}
                selectedRange={dateRange}
                onSelectRange={(range) => {
                  setDateRange(range);
                  if (range) setNoDueDate(false);
                }}
              />
            </div>
          ) : null}
        </div>

        )}

        <div
          className={
            tabLayout
              ? 'flex items-center gap-1.5 border-b border-ink/10 px-4 py-2'
              : 'space-y-1.5 border-b border-ink/10 px-4 py-2'
          }
        >
          <div
            className={tabLayout ? 'flex shrink-0 items-center gap-1' : 'grid grid-cols-3 gap-1'}
            role="group"
            aria-label="Task status filter"
          >
            {(['all', 'incomplete', 'completed'] as StatusFilter[]).map((entry) => {
              const active = statusFilter === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setStatusFilter(entry);
                    playSound('ui');
                  }}
                  className={`focus-ring rounded-lg px-1 py-1 text-[10px] font-semibold capitalize transition ${
                    active
                      ? 'bg-sage-deep text-ivory shadow-float'
                      : 'bg-white/45 text-ink-soft hover:bg-white/70'
                  }`}
                  aria-pressed={active}
                >
                  {entry}
                </button>
              );
            })}
          </div>
          <div className={`flex items-center gap-1.5 ${tabLayout ? 'min-w-0 flex-1' : ''}`}>
            <select
              value={priorityFilter}
              onChange={(event) => {
                setPriorityFilter(event.target.value as PriorityFilter);
                playSound('ui');
              }}
              className="focus-ring min-w-0 flex-1 rounded-lg border border-ink/10 bg-ivory/100 px-1.5 py-1 text-[10px] font-semibold text-ink"
              aria-label="Filter by priority"
            >
              <option value="all">All priorities</option>
              {PRIORITIES.map((entry) => (
                <option key={entry} value={entry}>
                  {TASK_PRIORITY_LABELS[entry]} priority
                </option>
              ))}
            </select>
            {showCalendarView ? null : (
              <button
                type="button"
                onClick={() => {
                  setNoDueDate((current) => !current);
                  setDateRange(null);
                  playSound('ui');
                }}
                className={`focus-ring shrink-0 rounded-full px-1.5 py-1 text-[9px] font-semibold transition ${
                  noDueDate
                    ? 'bg-sage-deep text-ivory shadow-float'
                    : 'bg-white/45 text-ink-soft hover:bg-white/70'
                }`}
                aria-pressed={noDueDate}
                aria-label="Filter tasks with no due date"
                title="Tasks with no due date"
              >
                No due date
              </button>
            )}
            {dateRange ? (
              <span className="shrink-0 rounded-full bg-sage/15 px-1.5 py-0.5 text-[9px] font-semibold text-sage-deep">
                {dateRange.start === dateRange.end
                  ? formatDueDate(dateRange.start)
                  : `${formatDueDate(dateRange.start)} – ${formatDueDate(dateRange.end)}`}
              </span>
            ) : null}
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setDateRange(null);
                  setNoDueDate(false);
                  playSound('ui');
                }}
                className="focus-ring shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-terracotta-deep transition hover:bg-terracotta/10"
                aria-label="Clear task filters"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        <div className={calendarFill ? 'flex min-h-0 flex-1 flex-col px-3 py-2.5' : 'px-3 py-2.5'}>
          {showCalendarView ? (
            <TaskCalendarBoard
              view={tabView as TaskCalendarView}
              cursor={calendarCursor}
              tasks={filteredTasks}
              onCursorChange={setCalendarCursor}
              onViewChange={changeTabView}
              onToggle={handleToggle}
              onPin={handlePin}
              onDelete={handleDelete}
              onToast={onToast}
              onMoveTask={handleMoveTask}
              fill={calendarFill}
            />
          ) : tasks.length === 0 ? (
            <div className="mx-1 rounded-2xl border border-dashed border-sage/35 px-4 py-7 text-center">
              <p className="font-display text-[14px] text-ink">A quiet, empty list.</p>
              <p className="pt-1 text-[11.5px] leading-relaxed text-ink-soft/100">
                {tabLayout
                  ? 'Open the task bar to add a new task. Then check it off to earn your first coins.'
                  : 'Use New task to add one tiny thing. Then check it off to earn your first coins.'}
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="mx-1 rounded-2xl border border-dashed border-sand/45 px-4 py-6 text-center">
              <p className="font-display text-[13.5px] text-ink">No tasks match these filters.</p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setDateRange(null);
                  setNoDueDate(false);
                  playSound('ui');
                }}
                className="focus-ring mt-2 rounded-full bg-white/60 px-3 py-1 text-[10.5px] font-semibold text-sage-deep transition hover:bg-white/90"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className={tabLayout ? 'grid gap-1.5 sm:grid-cols-2' : 'flex flex-col gap-1.5'}>
              {orderedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onPin={handlePin}
                  onDelete={handleDelete}
                  onToast={onToast}
                />
              ))}
            </ul>
          )}
        </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink/10 px-4 py-2.5">
          <button
            type="button"
            onClick={handleReset}
            className={`focus-ring flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold transition ${
              confirmReset
                ? 'bg-terracotta/15 text-terracotta-deep'
                : 'text-ink-soft/90 hover:bg-terracotta/10 hover:text-terracotta-deep'
            }`}
            aria-label={confirmReset ? 'Confirm reset world' : 'Reset world'}
            title={
              confirmReset
                ? 'Click again to start a fresh world'
                : 'Reset world'
            }
          >
            <RefreshCw size={11} />
            {confirmReset ? 'Confirm Reset?' : 'Reset world'}
          </button>
        </footer>
      </div>
      </div>
      <TaskCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onToast={onToast}
      />
    </div>
  );
}
