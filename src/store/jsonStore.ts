import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Database, StoredDatabase } from '../domain/types.js';
import { emptyDatabase, migrate } from '../domain/types.js';
import type { ProjectWorkspace } from '../domain/workspace.js';
import type { Store } from './store.js';

/**
 * File-backed Store. Writes go to a temp file then `rename` over the target so
 * a crash mid-write can never leave a half-written database. A missing file is
 * treated as an empty database (first run).
 *
 * `docsRoot` is the shared, human-facing workspace directory (see
 * `config.docsRoot`) — distinct from where `data.json` lives. Every project's
 * folder is created directly beneath it.
 */
export class JsonStore implements Store {
  constructor(
    private readonly filePath: string,
    private readonly docsRoot: string,
  ) {}

  async read(): Promise<Database> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return migrate(JSON.parse(raw) as StoredDatabase);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return emptyDatabase();
      }
      throw err;
    }
  }

  async write(db: Database): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
    await rename(tmp, this.filePath); // atomic replace on the same filesystem
  }

  /**
   * Create the project's workspace folder beneath the shared docs root.
   * Directories are made recursively (idempotent), so the root is created once
   * and reused; seed files use the `wx` flag so a re-scaffold never overwrites
   * notes the user has since edited.
   */
  async scaffoldProject(workspace: ProjectWorkspace): Promise<void> {
    const root = this.workspacePath(workspace.folder);
    for (const dir of [root, ...workspace.dirs.map((d) => join(root, d))]) {
      await mkdir(dir, { recursive: true });
    }
    for (const file of workspace.files) {
      try {
        await writeFile(join(root, file.path), file.contents, { encoding: 'utf8', flag: 'wx' });
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      }
    }
  }

  async writeWorkspaceFile(folder: string, relPath: string, contents: string): Promise<void> {
    const root = this.workspacePath(folder);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, relPath), contents, 'utf8');
  }

  async appendWorkspaceFile(folder: string, relPath: string, contents: string): Promise<void> {
    const root = this.workspacePath(folder);
    await mkdir(root, { recursive: true });
    await appendFile(join(root, relPath), contents, 'utf8');
  }

  async archiveProjectWorkspace(folder: string): Promise<void> {
    const src = this.workspacePath(folder);
    const dest = this.workspacePath(join('.archived', folder));
    try {
      await mkdir(dirname(dest), { recursive: true });
      await rm(dest, { recursive: true, force: true }); // replace any prior archive
      await rename(src, dest);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err; // nothing to archive
    }
  }

  /** Absolute path of a project's workspace folder under the shared docs root. */
  workspacePath(folder: string): string {
    return join(this.docsRoot, folder);
  }
}
