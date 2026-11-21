import { useState, type FormEvent } from 'react';
import {
  Check,
  ChevronRight,
  Coins,
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
}

export function TaskDrawer({ open, onToggle, onToast }: TaskDrawerProps) {
  const tasks = useWorldStore((state) => state.tasks);
  const coins = useWorldStore((state) => state.coins);
  const addTask = useWorldStore((state) => state.addTask);
  const toggleTask = useWorldStore((state) => state.toggleTask);
  const deleteTask = useWorldStore((state) => state.deleteTask);
  const resetWorld = useWorldStore((state) => state.resetWorld);
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<TaskTier>('standard');
  const [error, setError] = useState('');

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
      setTitle('');
      setError('');
      playSound('store');
      onToast('A fresh courtyard is waiting.', 'info');
    }
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
    <div className="absolute right-4 top-4 z-30 flex max-h-[calc(100vh-2rem)] w-[min(370px,calc(100vw-2rem))] flex-col">
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
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className={`group flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition ${
                    task.done
                      ? 'border-sage/25 bg-sage/10'
                      : 'border-ink/10 bg-white/40 hover:border-ink/10 hover:bg-white/60'
                  }`}
                >
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
                    className="focus-ring rounded-full p-1 text-ink-soft/30 opacity-0 transition hover:bg-terracotta/10 hover:text-terracotta-deep group-hover:opacity-100"
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-ink/10 px-4 py-2.5">
          <p className="text-[10.5px] leading-snug text-ink-soft/60">
            Checked tasks pay once. Coins never expire.
          </p>
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
