import { access, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { addNote } from '../commands/notes.js';
import { addProject, archiveProject } from '../commands/projects.js';
import { addTask, setTaskStatus } from '../commands/tasks.js';
import { projectWorkspace } from '../domain/workspace.js';
import { JsonStore } from './jsonStore.js';

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}

const dirs: string[] = [];

async function tempStore() {
  const dir = await mkdtemp(join(tmpdir(), 'pt-'));
  dirs.push(dir);
  // Data file and the (separate) docs root are both isolated under the temp dir.
  const docs = join(dir, 'docs');
  return { dir, docs, store: new JsonStore(join(dir, 'data.json'), docs) };
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('JsonStore.scaffoldProject', () => {
  it('creates <slug>/{tracker.csv,notepad.md,details/} under the docs root', async () => {
    const { docs, store } = await tempStore();
    await store.scaffoldProject(projectWorkspace('Website Redesign', new Date('2026-07-14')));

    const base = join(docs, 'website-redesign');
    expect(await readFile(join(base, 'tracker.csv'), 'utf8')).toMatch(/^Task ID,Title,Status/);
    expect(await readFile(join(base, 'notepad.md'), 'utf8')).toContain('# Website Redesign');
    expect((await stat(join(base, 'details'))).isDirectory()).toBe(true);
  });

  it('does not clobber a seed file the user has since edited', async () => {
    const { docs, store } = await tempStore();
    const ws = projectWorkspace('Notes', new Date('2026-07-14'));

    await store.scaffoldProject(ws);
    const notepad = join(docs, 'notes', 'notepad.md');
    await writeFile(notepad, 'my edits', 'utf8');

    await store.scaffoldProject(ws); // re-scaffold is idempotent
    expect(await readFile(notepad, 'utf8')).toBe('my edits');
  });

  it('shares one docs root across projects, creating each subfolder in place', async () => {
    const { docs, store } = await tempStore();
    await addProject(store, 'Alpha');
    await addProject(store, 'Beta');

    expect(await exists(join(docs, 'alpha', 'tracker.csv'))).toBe(true);
    expect(await exists(join(docs, 'beta', 'tracker.csv'))).toBe(true);
  });
});

describe('tracker sync through the task commands', () => {
  it('rewrites tracker.csv as tasks are added and completed', async () => {
    const { docs, store } = await tempStore();
    await addProject(store, 'Website');
    const tracker = join(docs, 'website', 'tracker.csv');

    const design = await addTask(store, { projectRef: 'Website', title: 'Design home' });
    expect(await readFile(tracker, 'utf8')).toContain(`${design.id},Design home,todo,2,,`);

    await setTaskStatus(store, design.id, 'done');
    expect(await readFile(tracker, 'utf8')).toMatch(new RegExp(`${design.id},Design home,done,2,`));
  });

  it('writes the deadline into the tracker', async () => {
    const { docs, store } = await tempStore();
    await addProject(store, 'Website');

    const t = await addTask(store, {
      projectRef: 'Website',
      title: 'Launch',
      deadline: '2026-08-01',
    });
    expect(await readFile(join(docs, 'website', 'tracker.csv'), 'utf8')).toContain(
      `${t.id},Launch,todo,2,2026-08-01,`,
    );
  });
});

describe('reading an older data file', () => {
  it('migrates a v1 store on read, defaulting deadline to null', async () => {
    const { dir, store } = await tempStore();
    const v1 = {
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
    await writeFile(join(dir, 'data.json'), JSON.stringify(v1), 'utf8');

    const db = await store.read();
    expect(db.version).toBe(2);
    expect(db.tasks[0]?.deadline).toBeNull();
  });
});

describe('note append through addNote', () => {
  it('appends dated entries to notepad.md without erasing prior content', async () => {
    const { docs, store } = await tempStore();
    await addProject(store, 'Website');
    const notepad = join(docs, 'website', 'notepad.md');

    await addNote(store, 'Website', 'First note');
    await addNote(store, 'Website', 'Second note');

    const text = await readFile(notepad, 'utf8');
    expect(text).toContain('# Website — Notes'); // seed heading preserved
    expect(text).toContain('First note');
    expect(text.indexOf('First note')).toBeLessThan(text.indexOf('Second note'));
  });
});

describe('archiveProjectWorkspace', () => {
  it('moves the workspace under .archived and out of the active tree', async () => {
    const { docs, store } = await tempStore();
    await addProject(store, 'Website');
    await archiveProject(store, 'Website');

    expect(await exists(join(docs, 'website'))).toBe(false);
    expect(await exists(join(docs, '.archived', 'website', 'notepad.md'))).toBe(true);
  });

  it('is a no-op when the project has no workspace on disk', async () => {
    const { store } = await tempStore();
    await expect(store.archiveProjectWorkspace('ghost')).resolves.toBeUndefined();
  });
});
