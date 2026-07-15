import type { Database } from '../domain/types.js';
import { emptyDatabase } from '../domain/types.js';

/**
 * Persistence boundary. Commands depend on this interface only, never on a
 * concrete implementation — that is what makes them unit-testable with
 * `MemoryStore`. A `read()`/mutate/`write()` cycle is one logical transaction.
 */
export interface Store {
  read(): Promise<Database>;
  write(db: Database): Promise<void>;
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
}
