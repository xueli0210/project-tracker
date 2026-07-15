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
}

/** On-disk shape. Bump `version` and add a migration when this changes. */
export interface Database {
  version: 1;
  projects: Project[];
  tasks: Task[];
}

export function emptyDatabase(): Database {
  return { version: 1, projects: [], tasks: [] };
}
