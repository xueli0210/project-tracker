export type ProjectStatus = 'active' | 'archived';
export type TaskStatus = 'todo' | 'doing' | 'done';
export type Priority = 1 | 2 | 3; // 1 = high, 2 = normal, 3 = low

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string; // ISO 8601
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: string; // ISO 8601
  completedAt: string | null; // ISO 8601, set iff status === 'done'
  deadline: string | null; // ISO 8601 date (YYYY-MM-DD), or null if none
}

/** On-disk shape. Bump `version` and add a migration when this changes. */
export interface Database {
  version: 2;
  projects: Project[];
  tasks: Task[];
}

export function emptyDatabase(): Database {
  return { version: 2, projects: [], tasks: [] };
}

// Persisted shape from any prior version; fields added later are optional here.
type StoredTask = Omit<Task, 'deadline'> & { deadline?: string | null };
export interface StoredDatabase {
  version: number;
  projects: Project[];
  tasks: StoredTask[];
}

// v1 → v2: tasks gained `deadline`.
export function migrate(db: StoredDatabase): Database {
  return {
    version: 2,
    projects: db.projects,
    tasks: db.tasks.map((t) => ({ ...t, deadline: t.deadline ?? null })),
  };
}
