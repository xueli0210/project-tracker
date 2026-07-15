import type { Project } from '../domain/types.js';
import { NOTEPAD_FILE, noteEntry, projectSlug } from '../domain/workspace.js';
import type { Store } from '../store/store.js';
import { resolveProject } from './projects.js';

/**
 * Append a dated note to a project's `notepad.md`. Resolves the project (by id
 * or name) to validate it and to locate its workspace folder; the note itself
 * lives only on disk, so this touches no database state.
 */
export async function addNote(
  store: Store,
  projectRef: string,
  text: string,
  now: Date = new Date(),
): Promise<Project> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Note cannot be empty');
  }
  const db = await store.read();
  const project = resolveProject(db.projects, projectRef);
  if (!project) {
    throw new Error(`Unknown project: ${projectRef}`);
  }
  await store.appendWorkspaceFile(projectSlug(project.name), NOTEPAD_FILE, noteEntry(trimmed, now));
  return project;
}
