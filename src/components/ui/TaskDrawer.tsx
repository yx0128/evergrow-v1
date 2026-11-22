import { useState, type DragEvent, type FormEvent } from 'react';
import {
  Check,
  ChevronRight,
  Coins,
  GripVertical,
  ListTodo,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { TASK_REWARDS, TASK_TIER_LABELS } from '../../data/items';
import { playSound } from '../../lib/sound';
import { useWorldStore } from '../../store/useWorldStore';
import type { TaskTier } from '../../types';
import type { ToastTone } from '../../types-ui';

const TIERS: TaskTier[] = ['quick', 'standard', 'deep'];

interface TaskDrawerProps {
  open: boolean;
  onToggle: () => void;
  onToast: (message: string, tone: ToastTone) => void;
  onReset?: () => void;
}

export function TaskDrawer({ open, onToggle, onToast, onReset }: TaskDrawerProps) {
  const tasks = useWorldStore((state) => state.tasks);
  const coins = useWorldStore((state) => state.coins);
  const addTask = useWorldStore((state) => state.addTask);
  const toggleTask = useWorldStore((state) => state.toggleTask);
  const deleteTask = useWorldStore((state) => state.deleteTask);
  const reorderTask = useWorldStore((state) => state.reorderTask);
  const resetWorld = useWorldStore((state) => state.resetWorld);
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<TaskTier>('standard');
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: 'before' | 'after';
  } | null>(null);

  const done = tasks.filter((task) => task.done).length;
  const pending = tasks.length - done;
  const progress = tasks.length > 0 ? (done / tasks.length) * 100 : 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = addTask(title, tier);
    if (result.ok) {
      setTitle('');
      setError('');
      playSound('ui');
    } else {
      setError(result.message);
      playSound('error');
    }
  }

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

  function handleReset() {
    if (window.confirm('Reset the world, coins, tasks, and inventory to the starter courtyard?')) {
      resetWorld();
      onReset?.();
      setTitle('');
      setError('');
      playSound('store');
      onToast('A fresh courtyard is waiting.', 'info');
    }
  }

  function reorderTo(taskId: string, insertIndex: number) {
    reorderTask(taskId, insertIndex);
    playSound('ui');
  }

  function clearDrag() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleDrop(event: DragEvent<HTMLLIElement>, targetId: string) {
    event.preventDefault();
    const sourceId = draggingId;
    if (!sourceId || sourceId === targetId) {
      clearDrag();
      return;
    }
    const sourceIndex = tasks.findIndex((task) => task.id === sourceId);
    const targetIndex = tasks.findIndex((task) => task.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) {
      clearDrag();
      return;
    }
    const edge = dropTarget?.id === targetId ? dropTarget.edge : 'after';
    let insertIndex = edge === 'before' ? targetIndex : targetIndex + 1;
    if (sourceIndex < insertIndex) insertIndex -= 1;
    reorderTask(sourceId, insertIndex);
    playSound('ui');
    clearDrag();
  }

  if (!open) {
    return (
      <div className="pointer-events-none absolute right-4 top-4 z-30">
        <button
          type="button"
          onClick={onToggle}
          className="glass-pill focus-ring pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-float transition hover:-translate-y-0.5"
          aria-label={`Open task list. ${pending} tasks remaining.`}
        >
          <ListTodo size={16} className="text-sage-deep" />
          <span className="hidden sm:inline">Tasks</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta/20 px-1.5 text-[10.5px] font-bold text-terracotta-deep">
            {pending}
          </span>
          <span className="hidden items-center gap-1 border-l border-ink/10 pl-2 text-gold-deep md:flex">
            <Coins size={13} />
            {coins}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="task-drawer"
      className="absolute right-4 top-4 z-30 flex max-h-[calc(100vh-2rem-var(--hud-dock-space,140px))] w-[min(370px,calc(100vw-2rem))] flex-col"
    >
      <div className="glass-panel flex max-h-full animate-panel-in flex-col overflow-hidden rounded-[26px]">
        <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div>
            <h2 className="font-display text-[19px] leading-tight text-ink">
              Today&apos;s Tasks
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1.5 text-[13px] font-semibold text-gold-deep">
              <Coins size={14} />
              {coins.toLocaleString()}
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="hud-button focus-ring !px-1.5"
              aria-label="Collapse task list"
              title="Collapse"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        <div className="px-4 pb-3">
          <div className="flex items-center justify-between pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft/60">
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

        <form onSubmit={handleSubmit} className="border-y border-ink/10 bg-white/30 px-4 py-3">
          <div className="flex gap-2">
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError('');
              }}
              maxLength={120}
              placeholder="Add a small task…"
              className="focus-ring min-w-0 flex-1 rounded-2xl border border-ink/10 bg-ivory/100 px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-soft/40"
              aria-label="Task name"
            />
            <button
              type="submit"
              className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage-deep text-ivory shadow-float transition hover:bg-moss active:scale-95"
              aria-label="Add task"
              title="Add task"
            >
              <Plus size={17} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {TIERS.map((entry) => {
              const active = tier === entry;
              return (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    setTier(entry);
                    playSound('ui');
                  }}
                  className={`focus-ring rounded-xl border px-1.5 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? 'border-terracotta/40 bg-terracotta/15 text-terracotta-deep shadow-inner-soft'
                      : 'border-ink/10 bg-white/40 text-ink-soft/100 hover:border-ink/15 hover:bg-white/60'
                  }`}
                  aria-pressed={active}
                >
                  <span className="block leading-tight">{TASK_TIER_LABELS[entry]}</span>
                  <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-bold text-gold-deep">
                    <Coins size={9} />+{TASK_REWARDS[entry]}
                  </span>
                </button>
              );
            })}
          </div>
          {error ? (
            <p className="pt-1.5 text-[11px] font-medium text-terracotta-deep" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
          {tasks.length === 0 ? (
            <div className="mx-1 rounded-2xl border border-dashed border-sage/35 px-4 py-7 text-center">
              <p className="font-display text-[14px] text-ink">A quiet, empty list.</p>
              <p className="pt-1 text-[11.5px] leading-relaxed text-ink-soft/100">
                Add one tiny thing above. Then check it off to earn your first coins.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {tasks.map((task, index) => {
                const isDragging = draggingId === task.id;
                const edge = dropTarget?.id === task.id ? dropTarget.edge : null;
                return (
                <li
                  key={task.id}
                  onDragOver={(event) => {
                    if (!draggingId || draggingId === task.id) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    const rect = event.currentTarget.getBoundingClientRect();
                    const nextEdge =
                      event.clientY < rect.top + rect.height / 2
                        ? 'before'
                        : 'after';
                    setDropTarget((current) =>
                      current?.id === task.id && current.edge === nextEdge
                        ? current
                        : { id: task.id, edge: nextEdge },
                    );
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      return;
                    }
                    setDropTarget((current) =>
                      current?.id === task.id ? null : current,
                    );
                  }}
                  onDrop={(event) => handleDrop(event, task.id)}
                  className={`group relative flex items-center gap-2 rounded-2xl border px-2 py-2 transition ${
                    task.done
                      ? 'border-sage/25 bg-sage/10'
                      : 'border-ink/10 bg-white/40 hover:border-ink/10 hover:bg-white/60'
                  } ${isDragging ? 'opacity-45' : ''} ${
                    edge ? 'bg-white/70 ring-1 ring-sage-deep/35' : ''
                  }`}
                >
                  {edge === 'before' ? (
                    <span
                      className="pointer-events-none absolute inset-x-3 -top-[2px] h-[2px] rounded-full bg-sage-deep"
                      aria-hidden
                    />
                  ) : null}
                  {edge === 'after' ? (
                    <span
                      className="pointer-events-none absolute inset-x-3 -bottom-[2px] h-[2px] rounded-full bg-sage-deep"
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      const row = event.currentTarget.closest('li');
                      if (row) event.dataTransfer.setDragImage(row, 18, 18);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', task.id);
                      setDraggingId(task.id);
                      setDropTarget(null);
                    }}
                    onDragEnd={clearDrag}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp' && index > 0) {
                        event.preventDefault();
                        reorderTo(task.id, index - 1);
                      } else if (
                        event.key === 'ArrowDown' &&
                        index < tasks.length - 1
                      ) {
                        event.preventDefault();
                        reorderTo(task.id, index + 1);
                      }
                    }}
                    className="focus-ring -ml-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-ink-soft/35 transition hover:text-ink-soft/80 active:cursor-grabbing"
                    aria-label={`Reorder ${task.title}. Drag, or press arrow up or down.`}
                    title="Drag to reorder · ↑/↓"
                  >
                    <GripVertical size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(task.id)}
                    disabled={task.done}
                    className={`focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                      task.done
                        ? 'border-sage-deep bg-sage-deep text-ivory'
                        : 'border-ink/25 bg-ivory text-transparent hover:border-sage-deep hover:text-sage-deep'
                    }`}
                    aria-label={task.done ? `${task.title} complete` : `Complete ${task.title}`}
                    aria-pressed={task.done}
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <span
                    className={`min-w-0 flex-1 truncate text-[12.5px] ${
                      task.done
                        ? 'text-ink-soft/55 line-through decoration-sage-deep/40'
                        : 'font-medium text-ink'
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold-deep">
                    <Coins size={9} />+{TASK_REWARDS[task.tier]}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteTask(task.id);
                      playSound('ui');
                    }}
                    className="focus-ring rounded-full p-1 text-ink-soft/30 opacity-0 transition hover:bg-terracotta/10 hover:text-terracotta-deep focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100"
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-ink/10 px-4 py-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="focus-ring flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold text-ink-soft/60 transition hover:bg-terracotta/10 hover:text-terracotta-deep"
            title="Reset world"
          >
            <RefreshCw size={11} />
            Reset
          </button>
        </footer>
      </div>
    </div>
  );
}
