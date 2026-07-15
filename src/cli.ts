import { addNote } from './commands/notes.js';
import { addProject, archiveProject, listProjects } from './commands/projects.js';
import { addTask, listTasks, setTaskStatus } from './commands/tasks.js';
import { isPriority, isTaskStatus } from './domain/tasks.js';
import type { Priority, Task, TaskStatus } from './domain/types.js';
import { projectSlug } from './domain/workspace.js';
import type { Store } from './store/store.js';

const HELP = `pt — personal project & task tracker

Usage:
  pt project add <name>              Create a project
  pt project list                    List projects
  pt project archive <ref>           Archive a project (by id or name)

  pt task add <title> --project <ref> [--priority 1|2|3]
  pt task list [--project <ref>] [--status todo|doing|done]
  pt task start <id>                 Mark a task in progress
  pt task done <id>                  Mark a task done
  pt task reopen <id>                Move a task back to todo

  pt note add <text> --project <ref> Append a dated note to the project notepad

  pt help                            Show this help

Flags: --project/-p, --status/-s, --priority. A <ref> is a project id or name.
Data lives at ~/.project-tracker/data.json (override with PROJECT_TRACKER_HOME).
Each project gets a DOCS/<slug>/ folder (tracker.csv, notepad.md, details/).`;

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

/** Minimal argv parser: `--key value`, `--flag`, `-k value`, `-f`. */
function parse(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg.startsWith('-') && arg.length > 1) {
      const key = arg.replace(/^-+/, '');
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, flags };
}

function flagString(...values: (string | boolean | undefined)[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string') return v;
  }
  return undefined;
}

const STATUS_SYMBOL: Record<TaskStatus, string> = {
  todo: ' ',
  doing: '~',
  done: 'x',
};

function formatTask(t: Task): string {
  return `${t.id}  [${STATUS_SYMBOL[t.status]}] P${t.priority}  ${t.title}`;
}

/**
 * Run one CLI invocation. Returns a process exit code. `store` and `out` are
 * injected so the whole command surface can be driven from tests without a
 * real filesystem or capturing stdout.
 */
export async function run(
  argv: string[],
  store: Store,
  out: (line: string) => void = console.log,
): Promise<number> {
  const { positionals, flags } = parse(argv);
  const [group, action, ...rest] = positionals;

  if (!group || group === 'help' || flags.help === true || flags.h === true) {
    out(HELP);
    return 0;
  }

  try {
    if (group === 'project') {
      return await runProject(action, rest, store, out);
    }
    if (group === 'task') {
      return await runTask(action, rest, flags, store, out);
    }
    if (group === 'note') {
      return await runNote(action, rest, flags, store, out);
    }
    out(`Unknown command: ${group}. Run \`pt help\`.`);
    return 1;
  } catch (err) {
    out(`Error: ${(err as Error).message}`);
    return 1;
  }
}

async function runProject(
  action: string | undefined,
  rest: string[],
  store: Store,
  out: (line: string) => void,
): Promise<number> {
  if (action === 'add') {
    const project = await addProject(store, rest.join(' '));
    out(`Added project ${project.name} (${project.id})`);
    out(`  Workspace: DOCS/${projectSlug(project.name)}/`);
    return 0;
  }
  if (action === 'archive') {
    const ref = rest[0];
    if (!ref) throw new Error('Specify a project id or name');
    const project = await archiveProject(store, ref);
    out(`Archived project ${project.name} (workspace moved to DOCS/.archived/)`);
    return 0;
  }
  if (action === 'list' || action === undefined) {
    const projects = await listProjects(store);
    if (projects.length === 0) {
      out('No projects yet. Add one with: pt project add <name>');
      return 0;
    }
    for (const p of projects) {
      out(`${p.id}  ${p.name}  [${p.status}]`);
    }
    return 0;
  }
  out(`Unknown project command: ${action}. Run \`pt help\`.`);
  return 1;
}

async function runTask(
  action: string | undefined,
  rest: string[],
  flags: ParsedArgs['flags'],
  store: Store,
  out: (line: string) => void,
): Promise<number> {
  const projectRef = flagString(flags.project, flags.p);

  if (action === 'add') {
    if (!projectRef) throw new Error('Specify a project with --project <ref>');
    let priority: Priority | undefined;
    const rawPriority = flagString(flags.priority);
    if (rawPriority !== undefined) {
      const n = Number(rawPriority);
      if (!isPriority(n)) throw new Error('Priority must be 1, 2, or 3');
      priority = n;
    }
    const task = await addTask(store, { projectRef, title: rest.join(' '), priority });
    out(`Added task ${task.title} (${task.id})`);
    return 0;
  }

  if (action === 'list' || action === undefined) {
    let status: TaskStatus | undefined;
    const rawStatus = flagString(flags.status, flags.s);
    if (rawStatus !== undefined) {
      if (!isTaskStatus(rawStatus)) throw new Error(`Invalid status: ${rawStatus}`);
      status = rawStatus;
    }
    const tasks = await listTasks(store, { projectRef, status });
    if (tasks.length === 0) {
      out('No tasks match.');
      return 0;
    }
    for (const t of tasks) out(formatTask(t));
    return 0;
  }

  if (action === 'start' || action === 'done' || action === 'reopen') {
    const id = rest[0];
    if (!id) throw new Error('Specify a task id');
    const nextStatus: TaskStatus =
      action === 'done' ? 'done' : action === 'start' ? 'doing' : 'todo';
    const task = await setTaskStatus(store, id, nextStatus);
    out(`Task ${task.id} -> ${task.status}`);
    return 0;
  }

  out(`Unknown task command: ${action}. Run \`pt help\`.`);
  return 1;
}

async function runNote(
  action: string | undefined,
  rest: string[],
  flags: ParsedArgs['flags'],
  store: Store,
  out: (line: string) => void,
): Promise<number> {
  if (action === 'add') {
    const projectRef = flagString(flags.project, flags.p);
    if (!projectRef) throw new Error('Specify a project with --project <ref>');
    const project = await addNote(store, projectRef, rest.join(' '));
    out(`Added note to ${project.name}`);
    return 0;
  }
  out(`Unknown note command: ${action}. Run \`pt help\`.`);
  return 1;
}
