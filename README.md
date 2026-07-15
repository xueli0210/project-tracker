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
pt project add "Website Redesign"   # also scaffolds a DOCS/ workspace (see below)
pt project list
pt project archive "Website Redesign"

pt task add "Design the homepage" --project "Website Redesign" --priority 1
pt task list                       # all tasks, high priority first
pt task list --project "Website Redesign" --status todo
pt task start <task-id>
pt task done  <task-id>            # every change re-syncs the project tracker.csv
pt task reopen <task-id>

pt note add "Kickoff went well" --project "Website Redesign"

pt help
```

A project `<ref>` is either its id (e.g. `p_1a2b3c4d`) or its name.

## Data

State lives at `~/.project-tracker/data.json`. Point `PROJECT_TRACKER_HOME` at a
different directory to keep separate lists:

```bash
PROJECT_TRACKER_HOME=./.tracker pt task list
```

### Project workspaces

Creating a project also scaffolds a folder for it under a `DOCS/` directory
alongside the data file (so it follows `PROJECT_TRACKER_HOME` too):

```
DOCS/
  website-redesign/        # slug of the project name
    tracker.csv            # status-tracking sheet (opens in Excel)
    notepad.md             # free-form notes
    details/               # drop assets here
```

The files are plain CSV/Markdown by design — the tracker keeps its
zero-dependency promise rather than pulling in an `.xlsx`/`.docx` writer.

- **`tracker.csv` stays in sync.** Adding a task or changing its status
  regenerates the sheet from the current tasks (one row per task, ordered by
  priority then creation). Editing it by hand isn't useful — it's a projection.
- **`notepad.md` is append-only via `pt note add`.** Each note becomes a dated
  `##` section; the file is never rewritten, so your own edits are safe.
- **Archiving moves the folder aside.** `pt project archive` relocates
  `DOCS/<slug>/` to `DOCS/.archived/<slug>/` rather than deleting it, so notes
  and assets are preserved but out of the active tree.

## Development

```bash
npm run dev -- task list   # run from source
npm test                   # vitest
npm run typecheck
npm run lint               # biome (format + lint)
npm run build
```

Architecture and contribution rules are documented in [CLAUDE.md](./CLAUDE.md).
