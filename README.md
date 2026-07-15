# project-tracker (`pt`)

A small, dependency-free personal project & task tracker for the command line.
Projects hold tasks; tasks have a status (`todo` / `doing` / `done`) and a
priority (1 high – 3 low). Everything is stored in a single JSON file.

## Install

```bash
npm install
npm run build
npm link        # optional: puts `pt` on your PATH
```

Without `npm link`, run it via `node dist/index.js <args>` or, from source,
`npm run dev -- <args>`.

## Usage

```bash
pt project add "Website Redesign"
pt project list
pt project archive "Website Redesign"

pt task add "Design the homepage" --project "Website Redesign" --priority 1
pt task list                       # all tasks, high priority first
pt task list --project "Website Redesign" --status todo
pt task start <task-id>
pt task done  <task-id>
pt task reopen <task-id>

pt help
```

A project `<ref>` is either its id (e.g. `p_1a2b3c4d`) or its name.

## Data

State lives at `~/.project-tracker/data.json`. Point `PROJECT_TRACKER_HOME` at a
different directory to keep separate lists:

```bash
PROJECT_TRACKER_HOME=./.tracker pt task list
```

## Development

```bash
npm run dev -- task list   # run from source
npm test                   # vitest
npm run typecheck
npm run lint               # biome (format + lint)
npm run build
```

Architecture and contribution rules are documented in [CLAUDE.md](./CLAUDE.md).
