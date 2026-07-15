import { newId } from '../domain/ids.js';
import type { Project } from '../domain/types.js';
import type { Store } from '../store/store.js';

/** Find a project by exact id or case-insensitive name within a database. */
export function resolveProject(projects: Project[], ref: string): Project | undefined {
  const lower = ref.toLowerCase();
  return projects.find((p) => p.id === ref || p.name.toLowerCase() === lower);
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
  return project;
}
