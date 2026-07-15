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
  return { dir, store: new JsonStore(join(dir, 'data.json')) };
}

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('JsonStore.scaffoldProject', () => {
  it('creates DOCS/<slug>/{tracker.csv,notepad.md,details/} beside the data file', async () => {
    const { dir, store } = await tempStore();
    await store.scaffoldProject(projectWorkspace('Website Redesign', new Date('2026-07-14')));

    const base = join(dir, 'DOCS', 'website-redesign');
    expect(await readFile(join(base, 'tracker.csv'), 'utf8')).toMatch(/^Task ID,Title,Status/);
    expect(await readFile(join(base, 'notepad.md'), 'utf8')).toContain('# Website Redesign');
    expect((await stat(join(base, 'details'))).isDirectory()).toBe(true);
  });

  it('does not clobber a seed file the user has since edited', async () => {
    const { dir, store } = await tempStore();
    const ws = projectWorkspace('Notes', new Date('2026-07-14'));

    await store.scaffoldProject(ws);
    const notepad = join(dir, 'DOCS', 'notes', 'notepad.md');
    await writeFile(notepad, 'my edits', 'utf8');

    await store.scaffoldProject(ws); // re-scaffold is idempotent
    expect(await readFile(notepad, 'utf8')).toBe('my edits');
  });
});

describe('tracker sync through the task commands', () => {
  it('rewrites tracker.csv as tasks are added and completed', async () => {
    const { dir, store } = await tempStore();
    await addProject(store, 'Website');
    const tracker = join(dir, 'DOCS', 'website', 'tracker.csv');

    const design = await addTask(store, { projectRef: 'Website', title: 'Design home' });
    expect(await readFile(tracker, 'utf8')).toContain(`${design.id},Design home,todo,2,`);

    await setTaskStatus(store, design.id, 'done');
    expect(await readFile(tracker, 'utf8')).toMatch(new RegExp(`${design.id},Design home,done,2,`));
  });
});

describe('note append through addNote', () => {
  it('appends dated entries to notepad.md without erasing prior content', async () => {
    const { dir, store } = await tempStore();
    await addProject(store, 'Website');
    const notepad = join(dir, 'DOCS', 'website', 'notepad.md');

    await addNote(store, 'Website', 'First note');
    await addNote(store, 'Website', 'Second note');

    const text = await readFile(notepad, 'utf8');
    expect(text).toContain('# Website — Notes'); // seed heading preserved
    expect(text).toContain('First note');
    expect(text.indexOf('First note')).toBeLessThan(text.indexOf('Second note'));
  });
});

describe('archiveProjectWorkspace', () => {
  it('moves the workspace under DOCS/.archived and out of the active tree', async () => {
    const { dir, store } = await tempStore();
    await addProject(store, 'Website');
    await archiveProject(store, 'Website');

    expect(await exists(join(dir, 'DOCS', 'website'))).toBe(false);
    expect(await exists(join(dir, 'DOCS', '.archived', 'website', 'notepad.md'))).toBe(true);
  });

  it('is a no-op when the project has no workspace on disk', async () => {
    const { store } = await tempStore();
    await expect(store.archiveProjectWorkspace('ghost')).resolves.toBeUndefined();
  });
});
