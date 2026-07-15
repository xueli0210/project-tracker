import { newId } from '../domain/ids.js';
import { withStatus } from '../domain/tasks.js';
import type { Priority, Task, TaskStatus } from '../domain/types.js';
import type { Store } from '../store/store.js';
import { resolveProject, syncTracker } from './projects.js';

export interface AddTaskInput {
  projectRef: string;
  title: string;
  priority?: Priority;
  deadline?: string | null;
}

export async function addTask(
  store: Store,
  input: AddTaskInput,
  now: Date = new Date(),
): Promise<Task> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Task title cannot be empty');
  }
  const db = await store.read();
  const project = resolveProject(db.projects, input.projectRef);
  if (!project) {
    throw new Error(`Unknown project: ${input.projectRef}`);
  }
  const task: Task = {
    id: newId('t'),
    projectId: project.id,
    title,
    status: 'todo',
    priority: input.priority ?? 2,
    createdAt: now.toISOString(),
    completedAt: null,
    deadline: input.deadline ?? null,
  };
  db.tasks.push(task);
  await store.write(db);
  await syncTracker(store, project, db.tasks);
  return task;
}

export interface ListTasksFilter {
  projectRef?: string;
  status?: TaskStatus;
}

export async function listTasks(store: Store, filter: ListTasksFilter = {}): Promise<Task[]> {
  const db = await store.read();
  let projectId: string | undefined;
  if (filter.projectRef) {
    const project = resolveProject(db.projects, filter.projectRef);
    if (!project) {
      throw new Error(`Unknown project: ${filter.projectRef}`);
    }
    projectId = project.id;
  }
  return db.tasks
    .filter((t) => (projectId ? t.projectId === projectId : true))
    .filter((t) => (filter.status ? t.status === filter.status : true))
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
}

export async function setTaskStatus(
  store: Store,
  taskId: string,
  status: TaskStatus,
  now: Date = new Date(),
): Promise<Task> {
  const db = await store.read();
  const idx = db.tasks.findIndex((t) => t.id === taskId);
  const existing = db.tasks[idx];
  if (!existing) {
    throw new Error(`Unknown task: ${taskId}`);
  }
  const updated = withStatus(existing, status, now.toISOString());
  db.tasks[idx] = updated;
  await store.write(db);
  const project = db.projects.find((p) => p.id === updated.projectId);
  if (project) await syncTracker(store, project, db.tasks);
  return updated;
}
