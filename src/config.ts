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
