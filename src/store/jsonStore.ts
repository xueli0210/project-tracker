import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Database } from '../domain/types.js';
import { emptyDatabase } from '../domain/types.js';
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
}
