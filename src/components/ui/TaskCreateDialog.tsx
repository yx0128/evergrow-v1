import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, X } from 'lucide-react';
import {
  TASK_PRIORITY_LABELS,
  TASK_REWARDS,
  TASK_TIER_LABELS,
} from '../../data/items';
import { todayIso } from '../../lib/dates';
import { playSound } from '../../lib/sound';
import { useWorldStore } from '../../store/useWorldStore';
import type { TaskPriority, TaskTier } from '../../types';
import type { ToastTone } from '../../types-ui';
import { CoinIcon } from './CoinIcon';

interface TaskCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onToast: (message: string, tone: ToastTone) => void;
}

const TIERS: TaskTier[] = ['quick', 'standard', 'deep'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

export function TaskCreateDialog({
  open,
  onClose,
  onToast,
}: TaskCreateDialogProps) {
  const addTask = useWorldStore((state) => state.addTask);
  const [title, setTitle] = useState('');
  const [tier, setTier] = useState<TaskTier>('standard');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function addSubtaskDraft() {
    const clean = subtaskDraft.trim().replace(/\s+/g, ' ');
    if (!clean) return;
    if (subtasks.length >= 50) {
      setError('This task has too many subtasks.');
      playSound('error');
      return;
    }
    setSubtasks((current) => [...current, clean]);
    setSubtaskDraft('');
    setError('');
    playSound('ui');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = addTask(title, tier, priority, dueDate || null, subtasks);
    if (result.ok) {
      setTitle('');
      setDueDate('');
      setSubtasks([]);
      setSubtaskDraft('');
      setError('');
      playSound('ui');
      onToast(result.message, 'success');
      onClose();
    } else {
      setError(result.message);
      playSound('error');
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-create-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close new task dialog"
      />
      <div className="glass-panel relative w-full max-w-md animate-panel-in rounded-[26px] p-5 shadow-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-deep">
              New task
            </p>
            <h2
              id="task-create-title"
              className="mt-0.5 font-display text-[19px] leading-tight text-ink"
            >
              What needs doing?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hud-icon focus-ring !h-8 !w-8"
            aria-label="Close new task dialog"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4">
          <input
            autoFocus
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError('');
            }}
            maxLength={120}
            placeholder="Add a task…"
            className="focus-ring w-full rounded-2xl border border-ink/10 bg-ivory/100 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-soft/40"
            aria-label="Task name"
          />

          <div className="mt-3">
            <p className="pb-1 text-[9.5px] font-bold uppercase tracking-wide text-ink-soft/70">
              Size reward
            </p>
            <div className="grid grid-cols-3 gap-1.5">
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
                        : 'border-ink/10 bg-white/40 text-ink-soft hover:border-ink/15 hover:bg-white/60'
                    }`}
                    aria-pressed={active}
                  >
                    <span className="block leading-tight">
                      {TASK_TIER_LABELS[entry]}
                    </span>
                    <span className="mt-0.5 flex items-center justify-center gap-0.5 text-[10px] font-bold text-gold-deep">
                      <CoinIcon size={9} />+{TASK_REWARDS[entry]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <p className="pb-1 text-[9.5px] font-bold uppercase tracking-wide text-ink-soft/70">
              Priority
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITIES.map((entry) => {
                const active = priority === entry;
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setPriority(entry);
                      playSound('ui');
                    }}
                    className={`focus-ring rounded-xl border px-1 py-1.5 text-[11px] font-semibold transition ${
                      active
                        ? 'border-sage-deep/40 bg-sage/20 text-sage-deep'
                        : 'border-ink/10 bg-white/40 text-ink-soft hover:border-ink/15 hover:bg-white/60'
                    }`}
                    aria-pressed={active}
                  >
                    {TASK_PRIORITY_LABELS[entry]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <p className="pb-1 text-[9.5px] font-bold uppercase tracking-wide text-ink-soft/70">
              Deadline
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dueDate}
                min="2000-01-01"
                onChange={(event) => setDueDate(event.target.value)}
                className="focus-ring min-w-0 flex-1 rounded-lg border border-ink/10 bg-ivory/100 px-2 py-1.5 text-[11px] text-ink"
                aria-label="Task deadline"
              />
              <button
                type="button"
                onClick={() => setDueDate(todayIso())}
                className="focus-ring shrink-0 rounded-lg bg-white/60 px-2.5 py-1.5 text-[10.5px] font-semibold text-ink-soft transition hover:bg-white/90 hover:text-ink"
              >
                Today
              </button>
              {dueDate ? (
                <button
                  type="button"
                  onClick={() => setDueDate('')}
                  className="focus-ring shrink-0 rounded-lg px-1.5 py-1.5 text-[10.5px] font-semibold text-terracotta-deep transition hover:bg-terracotta/10"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <p className="pb-1 text-[9.5px] font-bold uppercase tracking-wide text-ink-soft/70">
              Subtasks
            </p>
            {subtasks.length > 0 ? (
              <ul className="mb-1.5 flex flex-wrap gap-1">
                {subtasks.map((entry, index) => (
                  <li
                    key={`${entry}-${index}`}
                    className="flex items-center gap-1 rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-semibold text-sage-deep"
                  >
                    <span className="max-w-[150px] truncate">{entry}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSubtasks((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        );
                        playSound('ui');
                      }}
                      className="focus-ring rounded-full p-0.5 text-sage-deep/70 transition hover:text-terracotta-deep"
                      aria-label={`Remove subtask ${entry}`}
                    >
                      <Trash2 size={9} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex items-center gap-1.5">
              <input
                value={subtaskDraft}
                onChange={(event) => setSubtaskDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addSubtaskDraft();
                  }
                }}
                maxLength={120}
                placeholder="Add a subtask…"
                className="focus-ring min-w-0 flex-1 rounded-lg border border-ink/10 bg-ivory/100 px-2 py-1.5 text-[11px] text-ink placeholder:text-ink-soft/40"
                aria-label="Add a subtask"
              />
              <button
                type="button"
                onClick={addSubtaskDraft}
                className="focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sage-deep text-ivory transition hover:bg-moss active:scale-95"
                aria-label="Add subtask"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {error ? (
            <p className="pt-2 text-[11px] font-medium text-terracotta-deep" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-ink-soft transition hover:bg-white/60 hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="focus-ring flex items-center gap-1 rounded-full bg-sage-deep px-4 py-1.5 text-[11.5px] font-bold text-ivory shadow-float transition hover:bg-moss active:scale-95"
            >
              <Plus size={14} />
              Add task
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
