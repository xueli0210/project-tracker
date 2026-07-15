import { describe, expect, it } from 'vitest';
import type { StoredDatabase } from './types.js';
import { migrate } from './types.js';

describe('migrate', () => {
  it('adds deadline:null to v1 tasks and bumps the version to 2', () => {
    const v1: StoredDatabase = {
      version: 1,
      projects: [{ id: 'p_1', name: 'A', status: 'active', createdAt: '2026-07-14T00:00:00.000Z' }],
      tasks: [
        {
          id: 't_1',
          projectId: 'p_1',
          title: 'x',
          status: 'todo',
          priority: 2,
          createdAt: '2026-07-14T00:00:00.000Z',
          completedAt: null,
        },
      ],
    };

    const db = migrate(v1);
    expect(db.version).toBe(2);
    expect(db.tasks[0]?.deadline).toBeNull();
  });

  it('preserves an existing deadline and is idempotent on v2', () => {
    const v2: StoredDatabase = {
      version: 2,
      projects: [],
      tasks: [
        {
          id: 't_1',
          projectId: 'p_1',
          title: 'x',
          status: 'doing',
          priority: 1,
          createdAt: '2026-07-14T00:00:00.000Z',
          completedAt: null,
          deadline: '2026-08-01',
        },
      ],
    };

    const db = migrate(v2);
    expect(db.version).toBe(2);
    expect(db.tasks[0]?.deadline).toBe('2026-08-01');
  });
});
