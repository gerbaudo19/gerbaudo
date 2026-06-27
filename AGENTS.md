# Gerbaudo — AGENTS.md

## What this is

Local CLI tool for backend API instrumentation. Two packages, no monorepo tool.

## Structure

```
cli/           @gerbaudo/cli     (CLI + Express daemon + SQLite)
sdk/node/      @gerbaudo/sdk-node (Express middleware + GerbaudoClient)
test-integration.ts               (standalone integration test)
```

## Commands

All run from `cli/`:

| Command | What it does |
|---|---|
| `npm run build` | `tsc` → `dist/` |
| `npm run dev` | `tsx src/index.ts` (direct run, no build) |
| `npm start` | `node dist/index.js` |
| `npm test` | `vitest run` |
| `npm run test:watch` | `vitest` (watch mode) |

CLI subcommands: `daemon`, `endpoints`, `install`/`init`, `log`, `stats`, `run`.

### Daemon flags

```sh
npx tsx src/index.ts daemon --port 9878 --db /absolute/path/to/db
```

`--port` and `--db` override `gerbaudo.json`. `--db` resolves relative to cwd (not the config file).

### gerbaudo run — path params

The `run` command matches endpoints by pattern. Path params like `:id` are extracted and substituted automatically:

```sh
gerbaudo run /api/users/123              # matches /api/users/:id
gerbaudo run /api/users --param id=123   # explicit param fills :id
gerbaudo run /api/users --param sort=asc # query param if no :sort in route
```

Extracted path params take precedence over `--param` values. Remaining `--param` keys become query string.

## Tests

```sh
cd cli && npm test           # 49 tests (vitest)
cd sdk/node && npm test      # 7 tests
npx tsx ../test-integration.ts  # integration (daemon smoketest)
```

- Unit tests: `vitest` (no config needed, but `vitest.config.ts` excludes `dist/` and `node_modules/`)
- Integration test: standalone `.ts` using native `fetch` + `spawn`, no test framework
- Test files live alongside source (`src/**/*.test.ts`), excluded from `tsc` build

## SDK conventions

- `import { gerbaudo } from '@gerbaudo/sdk-node'`
- `app.use(gerbaudo({ app }))` — auto-discovers Express routes by inspecting `app._router.stack`
- Batches intercept records (flush every 2s or at 50 records), guarded against concurrent flush
- Intercept recording is wrapped in try/catch — never crashes the backend
- Installed via path: `gerbaudo init --sdk` (or `npm install ../../sdk/node`)

## Key defaults

- Daemon port: `9876` (configurable via `gerbaudo.json` or `--port`)
- DB path: `.gerbaudo/data.db` relative to `gerbaudo.json`
- Config discovery: searches cwd upward (up to 10 levels) for `gerbaudo.json`
- Daemon listens on `127.0.0.1` only

## Architecture notes

- **ESM only** — `"type": "module"` in both packages
- All imports use `.js` extension (ESM convention, not `.ts`)
- SQLite via `better-sqlite3` (synchronous), WAL journal mode, auto-migrated on first `getDb()` call
- DB singleton has defensive check — if the connection is stale, `getDb()` recreates it
- UUID v4 for primary keys; `snake_case` in DB columns ↔ `camelCase` in TS
- The daemon is an Express app serving `/api/*` routes
- Agent endpoints (`/api/agent/endpoints`, `/api/agent/exec`) return formatted data + `"forward"` instructions (AI routing not yet implemented — `cli/src/agent/` is empty)
- `cli` depends on `commander`, `express`, `better-sqlite3`, `uuid`
- `sdk/node` has no runtime dependencies — uses native `fetch`, `@types/express` is dev-only
