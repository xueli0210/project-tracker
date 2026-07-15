import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../store/store.js';
import { addProject } from './projects.js';
import { addTask, listTasks, setTaskStatus } from './tasks.js';

async function seed() {
  const store = new MemoryStore();
  const project = await addProject(store, 'Website');
  return { store, project };
}

describe('addTask', () => {
  it('creates a todo task under a project resolved by name', async () => {
    const { store } = await seed();
    const task = await addTask(store, { projectRef: 'website', title: 'Design home' });
    expect(task.status).toBe('todo');
    expect(task.completedAt).toBeNull();
    expect(task.priority).toBe(2);
  });

  it('rejects an unknown project', async () => {
    const { store } = await seed();
    await expect(addTask(store, { projectRef: 'nope', title: 'x' })).rejects.toThrow(
      /Unknown project/,
    );
  });

  it('rejects an empty title', async () => {
    const { store } = await seed();
    await expect(addTask(store, { projectRef: 'Website', title: '  ' })).rejects.toThrow(
      /cannot be empty/,
    );
  });
});

describe('listTasks', () => {
  it('sorts by priority then creation time and filters by status', async () => {
    const { store } = await seed();
    await addTask(store, { projectRef: 'Website', title: 'low', priority: 3 });
    const high = await addTask(store, { projectRef: 'Website', title: 'high', priority: 1 });
    await setTaskStatus(store, high.id, 'done');

    const all = await listTasks(store, { projectRef: 'Website' });
    expect(all.map((t) => t.title)).toEqual(['high', 'low']);

    const open = await listTasks(store, { status: 'todo' });
    expect(open.map((t) => t.title)).toEqual(['low']);
  });
});

describe('setTaskStatus', () => {
  it('stamps and clears completedAt across transitions', async () => {
    const { store } = await seed();
    const task = await addTask(store, { projectRef: 'Website', title: 'ship' });

    const done = await setTaskStatus(store, task.id, 'done');
    expect(done.completedAt).not.toBeNull();

    const reopened = await setTaskStatus(store, task.id, 'todo');
    expect(reopened.completedAt).toBeNull();
  });

  it('rejects an unknown task id', async () => {
    const { store } = await seed();
    await expect(setTaskStatus(store, 't_missing', 'done')).rejects.toThrow(/Unknown task/);
  });
});
