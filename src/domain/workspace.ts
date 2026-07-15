/**
 * Pure specification and rendering of the on-disk workspace scaffolded for each
 * project. This layer decides *what* the folder tree and its files look like;
 * the store layer is responsible for actually creating them (the only place I/O
 * is allowed).
 *
 * Layout, rooted at the `DOCS/` directory that lives beside the data file:
 *
 *   DOCS/
 *     <project-slug>/
 *       tracker.csv   — status-tracking sheet, regenerated from the tasks
 *       notepad.md    — free-form notes, appended to via `pt note add`
 *       details/      — folder for assets
 */

import type { Task } from './types.js';

export const TRACKER_FILE = 'tracker.csv';
export const NOTEPAD_FILE = 'notepad.md';

const TRACKER_HEADER = 'Task ID,Title,Status,Priority,Created,Completed';

export interface WorkspaceFile {
  /** Path relative to the project's workspace folder, e.g. `tracker.csv`. */
  path: string;
  /** Initial contents, written only if the file does not already exist. */
  contents: string;
}

export interface ProjectWorkspace {
  /** Folder name for this project, relative to the `DOCS/` root. */
  folder: string;
  /** Sub-directories to create (relative to the project folder). */
  dirs: string[];
  /** Seed files to create (relative to the project folder). */
  files: WorkspaceFile[];
}

/**
 * Turn a project name into a filesystem-safe folder slug: lowercase, with runs
 * of non-alphanumeric characters collapsed to a single `-`. Falls back to
 * `project` when a name has no usable characters (e.g. all punctuation).
 */
export function projectSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

/** Escape a value for a CSV cell, quoting only when necessary (RFC 4180). */
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Render a project's tasks as the full contents of `tracker.csv` (header
 * included). Rows are ordered like `pt task list`: priority, then creation
 * time. Pure — the store overwrites the file with whatever this returns.
 */
export function trackerCsv(tasks: Task[]): string {
  const rows = [...tasks].sort(
    (a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt),
  );
  const lines = [TRACKER_HEADER];
  for (const t of rows) {
    lines.push(
      [
        t.id,
        csvField(t.title),
        t.status,
        String(t.priority),
        t.createdAt.slice(0, 10),
        t.completedAt ? t.completedAt.slice(0, 10) : '',
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

/** A dated Markdown block to append to `notepad.md` for a `pt note add`. */
export function noteEntry(text: string, now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 16).replace('T', ' ');
  return `\n## ${stamp}\n\n${text}\n`;
}

/** Initial contents of `notepad.md` for a freshly created project. */
function notepadSeed(name: string, now: Date): string {
  return `# ${name} — Notes\n\n_Created ${now.toISOString().slice(0, 10)}_\n`;
}

/** Build the workspace spec for a newly created project. Pure — no I/O. */
export function projectWorkspace(name: string, now: Date = new Date()): ProjectWorkspace {
  return {
    folder: projectSlug(name),
    dirs: ['details'],
    files: [
      { path: TRACKER_FILE, contents: trackerCsv([]) },
      { path: NOTEPAD_FILE, contents: notepadSeed(name, now) },
    ],
  };
}
