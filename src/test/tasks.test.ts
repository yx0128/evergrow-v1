import { describe, expect, it } from 'vitest';
import { filterTasks, orderTasks } from '../lib/tasks';
import type { Task } from '../types';

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: overrides.id,
    tier: 'quick',
    priority: 'medium',
    done: false,
    createdAt: 0,
    subtasks: [],
    ...overrides,
  };
}

const tasks: Task[] = [
  task({ id: 'done-today', done: true, dueDate: '2026-11-23' }),
  task({ id: 'open-later', dueDate: '2026-12-02', priority: 'high' }),
  task({ id: 'open-tomorrow', dueDate: '2026-11-24', priority: 'low' }),
  task({ id: 'open-none', priority: 'medium' }),
];

describe('task filters', () => {
  it('filters by completion status', () => {
    expect(
      filterTasks(tasks, { status: 'completed', priority: 'all' }).map((t) => t.id),
    ).toEqual(['done-today']);
    expect(
      filterTasks(tasks, { status: 'incomplete', priority: 'all' }).map((t) => t.id),
    ).toEqual(['open-later', 'open-tomorrow', 'open-none']);
    expect(filterTasks(tasks, { status: 'all', priority: 'all' })).toHaveLength(4);
  });

  it('filters by priority, exact date, and date range', () => {
    expect(
      filterTasks(tasks, { status: 'all', priority: 'high' }).map((t) => t.id),
    ).toEqual(['open-later']);
    expect(
      filterTasks(tasks, {
        status: 'all',
        priority: 'all',
        date: '2026-11-24',
      }).map((t) => t.id),
    ).toEqual(['open-tomorrow']);
    expect(
      filterTasks(tasks, {
        status: 'all',
        priority: 'all',
        from: '2026-11-24',
        to: '2026-12-01',
      }).map((t) => t.id),
    ).toEqual(['open-tomorrow']);
  });

  it('filters tasks that have no due date', () => {
    expect(
      filterTasks(tasks, {
        status: 'all',
        priority: 'all',
        noDueDate: true,
      }).map((t) => t.id),
    ).toEqual(['open-none']);
    expect(
      filterTasks(tasks, {
        status: 'incomplete',
        priority: 'high',
        noDueDate: true,
      }),
    ).toHaveLength(0);
  });
});

describe('task ordering', () => {
  it('sorts incomplete tasks before completed ones, then by due date', () => {
    expect(orderTasks(tasks).map((t) => t.id)).toEqual([
      'open-tomorrow',
      'open-later',
      'open-none',
      'done-today',
    ]);
  });

  it('uses priority as the tie-breaker for the same deadline', () => {
    const sameDay: Task[] = [
      task({ id: 'low', dueDate: '2026-12-01', priority: 'low' }),
      task({ id: 'high', dueDate: '2026-12-01', priority: 'high' }),
      task({ id: 'medium', dueDate: '2026-12-01', priority: 'medium' }),
    ];
    expect(orderTasks(sameDay).map((t) => t.id)).toEqual([
      'high',
      'medium',
      'low',
    ]);
  });

  it('keeps pinned unfinished tasks first', () => {
    const pinned = task({
      id: 'pinned',
      dueDate: '2027-01-01',
      priority: 'low',
      pinned: true,
    });
    expect(orderTasks([...tasks, pinned])[0].id).toBe('pinned');
  });
});
