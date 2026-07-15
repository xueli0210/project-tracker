import type { Database } from '../domain/types.js';
import { emptyDatabase } from '../domain/types.js';
import type { ProjectWorkspace } from '../domain/workspace.js';

/**
 * Persistence boundary. Commands depend on this interface only, never on a
 * concrete implementation — that is what makes them unit-testable with
 * `MemoryStore`. A `read()`/mutate/`write()` cycle is one logical transaction.
 */
export interface Store {
  read(): Promise<Database>;
  write(db: Database): Promise<void>;
  /**
   * Materialize the on-disk workspace scaffold for a new project (see
   * `domain/workspace.ts`). Idempotent and non-destructive: existing files are
   * left untouched. A no-op for stores without a backing filesystem.
   */
  scaffoldProject(workspace: ProjectWorkspace): Promise<void>;
  /** Overwrite a file inside a project's workspace folder (e.g. the tracker). */
  writeWorkspaceFile(folder: string, relPath: string, contents: string): Promise<void>;
  /** Append to a file inside a project's workspace folder (e.g. the notepad). */
  appendWorkspaceFile(folder: string, relPath: string, contents: string): Promise<void>;
  /** Retire a project's workspace folder (moved aside, not destroyed). */
  archiveProjectWorkspace(folder: string): Promise<void>;
}

/** In-memory Store for tests. Clones on read/write so callers cannot alias state. */
export class MemoryStore implements Store {
  private db: Database;

  constructor(initial: Database = emptyDatabase()) {
    this.db = structuredClone(initial);
  }

  async read(): Promise<Database> {
    return structuredClone(this.db);
  }

  async write(db: Database): Promise<void> {
    this.db = structuredClone(db);
  }

  /** No filesystem to scaffold or mutate in memory — these are all no-ops. */
  async scaffoldProject(): Promise<void> {}
  async writeWorkspaceFile(): Promise<void> {}
  async appendWorkspaceFile(): Promise<void> {}
  async archiveProjectWorkspace(): Promise<void> {}
}
