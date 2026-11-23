import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, ChevronDown, Pin, Plus, Trash2, X } from 'lucide-react';
import { TASK_PRIORITY_LABELS, TASK_REWARDS } from '../../data/items';
import { formatDueDate, isOverdue } from '../../lib/dates';
import { playSound } from '../../lib/sound';
import { useWorldStore } from '../../store/useWorldStore';
import type { Task, TaskPriority } from '../../types';
import type { ToastTone } from '../../types-ui';
import { CoinIcon } from './CoinIcon';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  high: 'bg-terracotta/20 text-terracotta-deep',
  medium: 'bg-gold/20 text-gold-deep',
  low: 'bg-sage/25 text-sage-deep',
};

interface TaskRowProps {
  task: Task;
  onToggle: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onToast: (message: string, tone: ToastTone) => void;
}

export function TaskRow({
  task,
  onToggle,
  onPin,
  onDelete,
  onToast,
}: TaskRowProps) {
  const addSubtask = useWorldStore((state) => state.addSubtask);
  const toggleSubtask = useWorldStore((state) => state.toggleSubtask);
  const deleteSubtask = useWorldStore((state) => state.deleteSubtask);
  const updateSubtask = useWorldStore((state) => state.updateSubtask);
  const setTaskPriority = useWorldStore((state) => state.setTaskPriority);
  const setTaskDueDate = useWorldStore((state) => state.setTaskDueDate);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState('');

  const total = task.subtasks.length;
  const finished = task.subtasks.filter((subtask) => subtask.done).length;
  const progress = total > 0 ? (finished / total) * 100 : 0;

  function handleAddSubtask(event: FormEvent) {
    event.preventDefault();
    const result = addSubtask(task.id, draft);
    if (result.ok) {
      setDraft('');
      playSound('ui');
    } else {
      playSound('error');
      onToast(result.message, 'error');
    }
  }

  function handleToggleSubtask(subtaskId: string) {
    const result = toggleSubtask(task.id, subtaskId);
    playSound(result.ok ? 'ui' : 'error');
    if (!result.ok) onToast(result.message, 'error');
  }

  function startEditingSubtask(subtaskId: string, title: string) {
    setEditingSubtaskId(subtaskId);
    setSubtaskDraft(title);
    playSound('ui');
  }

  function saveSubtask(subtaskId: string) {
    const result = updateSubtask(task.id, subtaskId, subtaskDraft);
    if (result.ok) {
      setEditingSubtaskId(null);
      playSound('ui');
    } else {
      playSound('error');
      onToast(result.message, 'error');
    }
  }

  return (
    <li
      className={`group relative flex flex-col rounded-2xl border px-2 py-2 transition ${
        task.done
          ? 'border-sage/25 bg-sage/10'
          : 'border-ink/10 bg-white/40 hover:border-ink/10 hover:bg-white/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggle(task.id)}
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
        <button
          type="button"
          onClick={() => {
            setDetailsOpen((current) => !current);
            playSound('ui');
          }}
          className={`focus-ring min-w-0 flex-1 break-words rounded px-0.5 text-left text-[12.5px] leading-snug transition hover:text-sage-deep ${
            task.done
              ? 'text-ink-soft/55 line-through decoration-sage-deep/40'
              : 'font-medium text-ink'
          }`}
          title={`${task.title} — edit due date and priority`}
          aria-expanded={detailsOpen}
          aria-label={`Edit due date and priority for ${task.title}`}
        >
          {task.title}
        </button>
        <span
          className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${PRIORITY_BADGE[task.priority]}`}
          title={`${TASK_PRIORITY_LABELS[task.priority]} priority`}
        >
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold-deep">
          <CoinIcon size={9} />+{TASK_REWARDS[task.tier]}
        </span>
        <div
          className={`flex shrink-0 items-center gap-0.5 overflow-hidden transition-all duration-200 ${
            task.pinned
              ? 'max-w-[52px] opacity-100'
              : 'max-w-0 opacity-0 group-hover:max-w-[52px] group-hover:opacity-100 group-focus-within:max-w-[52px] group-focus-within:opacity-100'
          }`}
        >
          {!task.done ? (
            <button
              type="button"
              onClick={() => onPin(task.id)}
              className={`focus-ring shrink-0 rounded-full p-1 transition ${
                task.pinned
                  ? 'bg-terracotta/20 text-terracotta-deep'
                  : 'text-terracotta-deep/70 hover:bg-terracotta/15 hover:text-terracotta-deep'
              }`}
              aria-pressed={Boolean(task.pinned)}
              aria-label={task.pinned ? `Unpin ${task.title}` : `Pin ${task.title} to the top`}
              title={task.pinned ? 'Unpin task' : 'Pin task to top'}
            >
              <Pin size={12} className={task.pinned ? 'fill-current' : undefined} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="focus-ring shrink-0 rounded-full p-1 text-ink-soft/40 transition hover:bg-terracotta/10 hover:text-terracotta-deep"
            aria-label={`Delete ${task.title}`}
            title="Delete task"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {task.dueDate ? (
        <div className="mt-1 flex items-center gap-1 pl-7">
          <CalendarDays
            size={10}
            className={isOverdue(task.dueDate, task.done) ? 'text-terracotta-deep' : 'text-ink-soft/60'}
          />
          <span
            className={`text-[9.5px] font-semibold ${
              isOverdue(task.dueDate, task.done)
                ? 'text-terracotta-deep'
                : 'text-ink-soft/75'
            }`}
          >
            Due {formatDueDate(task.dueDate)}
          </span>
        </div>
      ) : null}

      {total > 0 ? (
        <div className="mt-1.5 flex items-center gap-2 pl-7">
          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sage to-sage-deep transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-[9.5px] font-semibold text-ink-soft/80">
            {finished}/{total}
          </span>
        </div>
      ) : null}

      <div className="mt-1 flex items-center gap-1 pl-7">
        <button
          type="button"
          onClick={() => {
            setSubtasksOpen((current) => !current);
            playSound('ui');
          }}
          className="focus-ring flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-sage-deep transition hover:bg-sage/15"
          aria-expanded={subtasksOpen}
          aria-label={`${subtasksOpen ? 'Hide' : 'Show'} subtasks for ${task.title}`}
          title={total > 0 ? 'Manage subtasks' : 'Add a subtask'}
        >
          {total > 0 ? (
            <ChevronDown
              size={11}
              className={`transition-transform ${subtasksOpen ? 'rotate-180' : ''}`}
            />
          ) : (
            <Plus size={11} />
          )}
          {`${total} subtask${total === 1 ? '' : 's'}`}
        </button>
      </div>

      {detailsOpen ? (
        <div className="mt-1.5 space-y-2 rounded-xl bg-ink/[0.035] p-2 pl-7">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wide text-ink-soft/70">
              Deadline
            </span>
            <input
              type="date"
              value={task.dueDate ?? ''}
              onChange={(event) => {
                const result = setTaskDueDate(task.id, event.target.value || null);
                if (!result.ok) onToast(result.message, 'error');
              }}
              className="focus-ring rounded-md border border-ink/10 bg-ivory px-1 py-0.5 text-[10px] text-ink"
              aria-label={`Deadline for ${task.title}`}
            />
            {task.dueDate ? (
              <button
                type="button"
                onClick={() => {
                  setTaskDueDate(task.id, null);
                  playSound('ui');
                }}
                className="focus-ring rounded-full p-0.5 text-ink-soft/50 transition hover:bg-terracotta/10 hover:text-terracotta-deep"
                aria-label={`Clear deadline for ${task.title}`}
              >
                <X size={10} />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wide text-ink-soft/70">
              Priority
            </span>
            {PRIORITIES.map((priority) => {
              const active = task.priority === priority;
              return (
                <button
                  key={priority}
                  type="button"
                  onClick={() => {
                    setTaskPriority(task.id, priority);
                    playSound('ui');
                  }}
                  className={`focus-ring rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold transition ${
                    active
                      ? PRIORITY_BADGE[priority]
                      : 'text-ink-soft/60 hover:bg-white/60 hover:text-ink'
                  }`}
                  aria-pressed={active}
                >
                  {TASK_PRIORITY_LABELS[priority]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {subtasksOpen ? (
        <div className="mt-1.5 space-y-2 rounded-xl bg-ink/[0.035] p-2 pl-7">
          <p className="text-[9px] font-bold uppercase tracking-wide text-ink-soft/70">
            Subtasks
          </p>
          {task.subtasks.length > 0 ? (
            <ul className="space-y-1">
              {task.subtasks.map((subtask) => (
                <li key={subtask.id} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(subtask.id)}
                    className={`focus-ring flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                      subtask.done
                        ? 'border-sage-deep bg-sage-deep text-ivory'
                        : 'border-ink/25 bg-ivory text-transparent hover:border-sage-deep hover:text-sage-deep'
                    }`}
                    aria-label={
                      subtask.done
                        ? `Reopen ${subtask.title}`
                        : `Complete ${subtask.title}`
                    }
                    aria-pressed={subtask.done}
                  >
                    <Check size={9} strokeWidth={3} />
                  </button>
                  {editingSubtaskId === subtask.id ? (
                    <>
                      <input
                        autoFocus
                        value={subtaskDraft}
                        onChange={(event) => setSubtaskDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            saveSubtask(subtask.id);
                          } else if (event.key === 'Escape') {
                            setEditingSubtaskId(null);
                          }
                        }}
                        maxLength={120}
                        className="focus-ring min-w-0 flex-1 rounded-md border border-sage/40 bg-ivory px-1.5 py-0.5 text-[11px] text-ink"
                        aria-label={`Edit subtask ${subtask.title}`}
                      />
                      <button
                        type="button"
                        onClick={() => saveSubtask(subtask.id)}
                        className="focus-ring shrink-0 rounded-full bg-sage/20 p-1 text-sage-deep transition hover:bg-sage/35"
                        aria-label={`Save subtask ${subtask.title}`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubtaskId(null);
                          playSound('ui');
                        }}
                        className="focus-ring shrink-0 rounded-full p-1 text-ink-soft/50 transition hover:bg-white/60 hover:text-ink"
                        aria-label={`Cancel editing ${subtask.title}`}
                      >
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditingSubtask(subtask.id, subtask.title)}
                        className={`focus-ring min-w-0 flex-1 truncate rounded px-0.5 text-left text-[11px] transition hover:text-sage-deep ${
                          subtask.done
                            ? 'text-ink-soft/50 line-through'
                            : 'text-ink-soft'
                        }`}
                        title="Edit subtask"
                        aria-label={`Edit subtask ${subtask.title}`}
                      >
                        {subtask.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteSubtask(task.id, subtask.id);
                          playSound('ui');
                        }}
                        className="focus-ring shrink-0 rounded-full p-1 text-ink-soft/35 transition hover:bg-terracotta/10 hover:text-terracotta-deep"
                        aria-label={`Delete subtask ${subtask.title}`}
                      >
                        <Trash2 size={10} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={120}
              placeholder="Add a subtask…"
              className="focus-ring min-w-0 flex-1 rounded-lg border border-ink/10 bg-ivory/100 px-2 py-1 text-[11px] text-ink placeholder:text-ink-soft/40"
              aria-label={`Add a subtask to ${task.title}`}
            />
            <button
              type="submit"
              className="focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sage-deep text-ivory transition hover:bg-moss active:scale-95"
              aria-label={`Add subtask to ${task.title}`}
            >
              <Plus size={12} />
            </button>
          </form>
        </div>
      ) : null}

    </li>
  );
}
