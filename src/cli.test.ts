import { describe, expect, it } from 'vitest';
import { run } from './cli.js';
import { MemoryStore } from './store/store.js';

function harness() {
  const store = new MemoryStore();
  const lines: string[] = [];
  const out = (line: string) => lines.push(line);
  const call = (args: string) => run(args.split(' ').filter(Boolean), store, out);
  return { call, lines };
}

describe('cli', () => {
  it('adds a project and a task, then lists the task', async () => {
    const { call, lines } = harness();

    expect(await call('project add Website')).toBe(0);
    expect(await call('task add Design home --project Website --priority 1')).toBe(0);
    expect(await call('task list --project Website')).toBe(0);

    expect(lines.at(-1)).toMatch(/\[ \] P1 {2}Design home/);
  });

  it('adds a note to a project, and requires --project', async () => {
    const { call, lines } = harness();
    expect(await call('project add Website')).toBe(0);

    expect(await call('note add Kickoff went well --project Website')).toBe(0);
    expect(lines.at(-1)).toBe('Added note to Website');

    expect(await call('note add orphaned thought')).toBe(1);
    expect(lines.at(-1)).toMatch(/Specify a project/);
  });

  it('reports an error and non-zero exit for an unknown project', async () => {
    const { call, lines } = harness();
    expect(await call('task add x --project ghost')).toBe(1);
    expect(lines.at(-1)).toMatch(/Error: Unknown project/);
  });

  it('prints help with no arguments', async () => {
    const { call, lines } = harness();
    expect(await call('')).toBe(0);
    expect(lines[0]).toMatch(/personal project & task tracker/);
  });
});
