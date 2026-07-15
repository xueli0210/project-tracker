import { appendFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Database } from '../domain/types.js';
import { emptyDatabase } from '../domain/types.js';
import type { ProjectWorkspace } from '../domain/workspace.js';
import type { Store } from './store.js';

/**
 * File-backed Store. Writes go to a temp file then `rename` over the target so
 * a crash mid-write can never leave a half-written database. A missing file is
 * treated as an empty database (first run).
 */
export class JsonStore implements Store {
  constructor(private readonly filePath: string) {}

  async read(): Promise<Database> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return JSON.parse(raw) as Database;
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
   * Create the project's workspace under a `DOCS/` directory that sits beside
   * the data file (so it honors `PROJECT_TRACKER_HOME`). Directories are made
   * recursively (idempotent); seed files use the `wx` flag so a re-scaffold
   * never overwrites notes the user has since edited.
   */
  async scaffoldProject(workspace: ProjectWorkspace): Promise<void> {
    const root = this.workspaceDir(workspace.folder);
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
    const root = this.workspaceDir(folder);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, relPath), contents, 'utf8');
  }

  async appendWorkspaceFile(folder: string, relPath: string, contents: string): Promise<void> {
    const root = this.workspaceDir(folder);
    await mkdir(root, { recursive: true });
    await appendFile(join(root, relPath), contents, 'utf8');
  }

  async archiveProjectWorkspace(folder: string): Promise<void> {
    const src = this.workspaceDir(folder);
    const dest = this.workspaceDir(join('.archived', folder));
    try {
      await mkdir(dirname(dest), { recursive: true });
      await rm(dest, { recursive: true, force: true }); // replace any prior archive
      await rename(src, dest);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err; // nothing to archive
    }
  }

  /** Absolute path of a project's workspace under `DOCS/`, beside the data file. */
  private workspaceDir(folder: string): string {
    return join(dirname(this.filePath), 'DOCS', folder);
  }
}
