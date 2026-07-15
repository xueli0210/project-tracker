import { newId } from '../domain/ids.js';
import type { Project, Task } from '../domain/types.js';
import { TRACKER_FILE, projectSlug, projectWorkspace, trackerCsv } from '../domain/workspace.js';
import type { Store } from '../store/store.js';

/** Find a project by exact id or case-insensitive name within a database. */
export function resolveProject(projects: Project[], ref: string): Project | undefined {
  const lower = ref.toLowerCase();
  return projects.find((p) => p.id === ref || p.name.toLowerCase() === lower);
}

/**
 * Regenerate a project's `tracker.csv` from the current task set. Call after any
 * mutation that changes a project's tasks so the sheet stays in sync.
 */
export async function syncTracker(store: Store, project: Project, tasks: Task[]): Promise<void> {
  const own = tasks.filter((t) => t.projectId === project.id);
  await store.writeWorkspaceFile(projectSlug(project.name), TRACKER_FILE, trackerCsv(own));
}

export async function addProject(
  store: Store,
  name: string,
  now: Date = new Date(),
): Promise<Project> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Project name cannot be empty');
  }
  const db = await store.read();
  if (db.projects.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`Project "${trimmed}" already exists`);
  }
  const project: Project = {
    id: newId('p'),
    name: trimmed,
    status: 'active',
    createdAt: now.toISOString(),
  };
  db.projects.push(project);
  await store.write(db);
  await store.scaffoldProject(projectWorkspace(project.name, now));
  return project;
}

export async function listProjects(store: Store): Promise<Project[]> {
  const db = await store.read();
  return db.projects;
}

export async function archiveProject(store: Store, ref: string): Promise<Project> {
  const db = await store.read();
  const project = resolveProject(db.projects, ref);
  if (!project) {
    throw new Error(`Unknown project: ${ref}`);
  }
  project.status = 'archived';
  await store.write(db);
  await store.archiveProjectWorkspace(projectSlug(project.name));
  return project;
}
