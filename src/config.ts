import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Resolve the data file location. Defaults to `~/.project-tracker/data.json`.
 * Override the directory with the `PROJECT_TRACKER_HOME` env var (used by tests
 * and for keeping separate task lists).
 */
export function dataFilePath(env: NodeJS.ProcessEnv = process.env): string {
  const dir = env.PROJECT_TRACKER_HOME ?? join(homedir(), '.project-tracker');
  return join(dir, 'data.json');
}

/**
 * Resolve the workspace root — the single directory that holds every project's
 * `DOCS/`-style folder (`tracker.csv`, `notepad.md`, `details/`). Unlike the
 * data file, this is human-facing content, so it defaults to a *visible*
 * location: `~/Documents/project-tracker`. It is created once and shared by all
 * projects; each new project just adds its own subfolder beneath it.
 *
 * Precedence:
 *   1. `PROJECT_TRACKER_DOCS` — explicit override.
 *   2. `PROJECT_TRACKER_HOME/DOCS` — when an isolated home is set (tests, or a
 *      self-contained setup), keep the workspaces alongside that home's data.
 *   3. `~/Documents/project-tracker` — the default for normal use.
 */
export function docsRoot(env: NodeJS.ProcessEnv = process.env): string {
  if (env.PROJECT_TRACKER_DOCS) return env.PROJECT_TRACKER_DOCS;
  if (env.PROJECT_TRACKER_HOME) return join(env.PROJECT_TRACKER_HOME, 'DOCS');
  return join(homedir(), 'Documents', 'project-tracker');
}
