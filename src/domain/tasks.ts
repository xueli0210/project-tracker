import type { Priority, Task, TaskStatus } from './types.js';

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'doing', 'done'];
export const PRIORITIES: readonly Priority[] = [1, 2, 3];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function isPriority(value: number): value is Priority {
  return (PRIORITIES as readonly number[]).includes(value);
}

/**
 * Return a copy of `task` with a new status, keeping `completedAt` consistent.
 * Pure: does not mutate its input. This is the single source of truth for the
 * completedAt invariant — never set task.status directly.
 */
export function withStatus(task: Task, status: TaskStatus, now: string): Task {
  return {
    ...task,
    status,
    completedAt: status === 'done' ? (task.completedAt ?? now) : null,
  };
}
