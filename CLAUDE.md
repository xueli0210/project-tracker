# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`project-tracker` is a personal project & task tracker exposed as the `pt` CLI.
It is a TypeScript + Node (ESM) project with **zero runtime dependencies** — data
is persisted as a single JSON file. State is not a database or a server; it's one
file at `~/.project-tracker/data.json` (override the directory with the
`PROJECT_TRACKER_HOME` environment variable, which the tests rely on).

## Commands

```bash
npm run dev -- <args>   # run the CLI from source via tsx, e.g. npm run dev -- task list
npm test                # run all tests (vitest)
npm test -- tasks       # run one file by name substring (e.g. commands/tasks.test.ts)
npm run test:watch      # watch mode
npm run typecheck       # tsc --noEmit against the whole tree, tests included
npm run lint            # biome lint + format check (CI gate)
npm run format          # biome auto-format in place
npm run build           # emit dist/ via tsconfig.build.json (excludes *.test.ts)
npm start -- <args>     # run the built CLI from dist/
```

The green-bar gate before any change is considered done:
`npm run typecheck && npm run lint && npm test`.

## Architecture

The codebase is a strict layered pipeline. **Dependencies point one way** —
`cli → commands → { store, domain }`, and `store → domain`. Nothing lower ever
imports something higher.

- **`src/domain/`** — pure model and logic (`types.ts`, `tasks.ts`, `ids.ts`).
  No I/O, no `Store`, no `console`, no `process`. The persisted shape is the
  `Database` interface in `types.ts`.
- **`src/store/`** — the persistence boundary. `store.ts` defines the `Store`
  interface plus `MemoryStore` (used by tests); `jsonStore.ts` is the
  file-backed implementation. A `read()` → mutate → `write()` cycle is one
  logical transaction; `JsonStore.write` is atomic (temp file + `rename`).
  `Store` also carries the workspace verbs — `scaffoldProject`,
  `writeWorkspaceFile`, `appendWorkspaceFile`, `archiveProjectWorkspace` — which
  materialize a per-project `DOCS/<slug>/` folder (layout and file rendering are
  pure functions in `domain/workspace.ts`: `projectWorkspace`, `trackerCsv`,
  `noteEntry`). `MemoryStore` no-ops all of them so command/CLI tests stay
  filesystem-free; the real behavior is covered by `jsonStore.test.ts` in a temp
  dir. `tracker.csv` is regenerated from tasks on every task mutation
  (`syncTracker`); `pt note add` appends to `notepad.md`; archiving moves the
  folder to `DOCS/.archived/`.
- **`src/commands/`** — application operations (`addTask`, `listTasks`,
  `setTaskStatus`, `addProject`, …). They depend on the `Store` **interface
  only**, return plain data, and `throw new Error(<user-facing message>)` on bad
  input. They never format output or touch a concrete store.
- **`src/cli.ts`** — the only layer that parses argv, formats lines, and maps
  errors to exit codes. Its entry point is `run(argv, store, out)`, with the
  store and output sink injected so tests exercise the full command surface with
  no filesystem and no stdout capture.
- **`src/index.ts`** — thin `#!/usr/bin/env node` shim: construct a real
  `JsonStore` and call `run`.

Why it's shaped this way: keeping domain pure and commands store-agnostic is
what lets nearly everything be tested against `MemoryStore` and an in-memory
`out` collector, with only `jsonStore.ts` and `index.ts` touching real I/O.

## Conventions that will bite you if ignored

- **ESM + `NodeNext`:** relative imports must carry a `.js` extension even though
  the files are `.ts` — `import { newId } from '../domain/ids.js'`. Omitting it
  fails at runtime.
- **`verbatimModuleSyntax` is on:** type-only imports must use `import type`.
- **`noUncheckedIndexedAccess` is on:** indexing an array yields `T | undefined`;
  narrow before use (see `setTaskStatus`).
- **The `completedAt` invariant** (populated iff `status === 'done'`) lives only
  in `domain/tasks.ts#withStatus`. Route every status change through it; never
  assign `task.status` directly.
- **Changing the on-disk shape** means bumping `Database.version` in
  `domain/types.ts` and handling the previous shape when reading.

## Adding a feature (worked example: a new task command)

1. If it needs new model state or a rule, add it to `domain/` as pure functions
   and unit-test them directly.
2. Add the operation to the relevant file in `commands/`, taking `Store` and
   returning data; test it against a `MemoryStore`.
3. Wire the verb into the dispatch in `cli.ts` and extend the `HELP` text; add a
   `cli.test.ts` case driving it through `run` with the injected `out`.
4. Run the green-bar gate above.

## Subagent

`.claude/agents/tracker-dev.md` defines a `tracker-dev` subagent preloaded with
these rules — prefer delegating self-contained `src/` changes to it.
