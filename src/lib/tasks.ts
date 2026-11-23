import type { Task, TaskPriority } from '../types';

export type TaskStatusFilter = 'all' | 'incomplete' | 'completed';

export interface TaskFilters {
  status: TaskStatusFilter;
  priority: TaskPriority | 'all';
  date?: string | null;
  from?: string;
  to?: string;
  noDueDate?: boolean;
}

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    if (filters.status === 'incomplete' && task.done) return false;
    if (filters.status === 'completed' && !task.done) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false;
    }
    if (filters.noDueDate) return !task.dueDate;
    if (filters.date) return task.dueDate === filters.date;
    if (filters.from || filters.to) {
      if (!task.dueDate) return false;
      if (filters.from && task.dueDate < filters.from) return false;
      if (filters.to && task.dueDate > filters.to) return false;
    }
    return true;
  });
}

export function isPinnedTask(task: Task): boolean {
  return Boolean(task.pinned && !task.done);
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function orderTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pinDiff = Number(isPinnedTask(b)) - Number(isPinnedTask(a));
    if (pinDiff !== 0) return pinDiff;
    if (a.done !== b.done) return a.done ? 1 : -1;
    const aDue = a.dueDate ?? '9999-12-31';
    const bDue = b.dueDate ?? '9999-12-31';
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.createdAt - b.createdAt;
  });
}
