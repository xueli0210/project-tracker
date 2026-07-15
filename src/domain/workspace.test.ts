import { describe, expect, it } from 'vitest';
import type { Task } from './types.js';
import { noteEntry, projectSlug, projectWorkspace, trackerCsv } from './workspace.js';

function task(overrides: Partial<Task>): Task {
  return {
    id: 't_1',
    projectId: 'p_1',
    title: 'Task',
    status: 'todo',
    priority: 2,
    createdAt: '2026-07-14T00:00:00.000Z',
    completedAt: null,
    deadline: null,
    ...overrides,
  };
}

describe('projectSlug', () => {
  it('lowercases and hyphenates non-alphanumeric runs', () => {
    expect(projectSlug('Website Redesign')).toBe('website-redesign');
    expect(projectSlug('  Q3 / 2026 Launch!!  ')).toBe('q3-2026-launch');
  });

  it('falls back to "project" when nothing usable remains', () => {
    expect(projectSlug('!!!')).toBe('project');
  });
});

describe('projectWorkspace', () => {
  it('describes the DOCS folder tree for a project', () => {
    const ws = projectWorkspace('Website Redesign', new Date('2026-07-14T12:00:00Z'));

    expect(ws.folder).toBe('website-redesign');
    expect(ws.dirs).toEqual(['details']);
    expect(ws.files.map((f) => f.path)).toEqual(['tracker.csv', 'notepad.md']);
  });

  it('seeds a tracker header and a dated, human-titled notepad', () => {
    const ws = projectWorkspace('Website Redesign', new Date('2026-07-14T12:00:00Z'));
    const byPath = Object.fromEntries(ws.files.map((f) => [f.path, f.contents]));

    expect(byPath['tracker.csv']).toBe(
      'Task ID,Title,Status,Priority,Deadline,Created,Completed\n',
    );
    expect(byPath['notepad.md']).toBe('# Website Redesign — Notes\n\n_Created 2026-07-14_\n');
  });
});

describe('trackerCsv', () => {
  it('renders header-only for a project with no tasks', () => {
    expect(trackerCsv([])).toBe('Task ID,Title,Status,Priority,Deadline,Created,Completed\n');
  });

  it('orders by priority then creation, with deadline and completion dates', () => {
    const csv = trackerCsv([
      task({
        id: 't_low',
        title: 'low',
        priority: 3,
        createdAt: '2026-07-14T00:00:00.000Z',
        deadline: '2026-08-01',
      }),
      task({
        id: 't_hi',
        title: 'high',
        priority: 1,
        status: 'done',
        createdAt: '2026-07-13T00:00:00.000Z',
        completedAt: '2026-07-15T09:30:00.000Z',
      }),
    ]);
    expect(csv).toBe(
      'Task ID,Title,Status,Priority,Deadline,Created,Completed\n' +
        't_hi,high,done,1,,2026-07-13,2026-07-15\n' +
        't_low,low,todo,3,2026-08-01,2026-07-14,\n',
    );
  });

  it('quotes and escapes titles containing commas or quotes', () => {
    const csv = trackerCsv([task({ id: 't_x', title: 'Ship v1, "final"' })]);
    expect(csv).toContain('t_x,"Ship v1, ""final""",todo,2,,2026-07-14,\n');
  });
});

describe('noteEntry', () => {
  it('formats a dated Markdown block', () => {
    expect(noteEntry('Kickoff call went well', new Date('2026-07-14T09:05:00Z'))).toBe(
      '\n## 2026-07-14 09:05\n\nKickoff call went well\n',
    );
  });
});
