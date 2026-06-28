# Gerbaudo — AGENTS.md

## What this is

Local CLI tool for backend API instrumentation. Two packages, no monorepo tool.

## Structure

cli/           @gerbaudo/cli     (CLI + Express daemon + SQLite)
sdk/node/      @gerbaudo/sdk-node (Express middleware + GerbaudoClient)
test-integration.ts               (standalone integration test)

## Commands

All run from `cli/`:

| Command | What it does |
|---|---|
| `npm run build` | `tsc` → `dist/` |
| `npm run dev` | `tsx src/index.ts` (pass subcommand as arg: `npm run dev daemon`) |
| `npm start` | `node dist/index.js` |
| `npm test` | `vitest run` |
| `npm run test:watch` | `vitest` (watch mode) |

CLI subcommands: `daemon`, `endpoints`, `export`, `install`/`init`, `log`, `stats`, `run`.

### Daemon flags

`--port` and `--db` override `gerbaudo.json`. `--db` resolves relative to cwd (not the config file). Default port: `9876`; repo-local dev config at `cli/gerbaudo.json` uses `9877`.

### gerbaudo run — path params

Path params like `:id` are extracted from the actual path and take precedence over `--param` values. Remaining `--param` keys become query string.

## Tests

```sh
cd cli && npm test              # unit tests (vitest, ~59 tests)
cd sdk/node && npm test         # 7 unit tests
npx tsx ../test-integration.ts  # integration (daemon smoketest)
```

- Unit tests live alongside source (`src/**/*.test.ts`), excluded from `tsc` build
- Integration test is standalone `.ts` using native `fetch` + `spawn`; on Windows it spawns via `cmd.exe`

## SDK conventions

- `import { gerbaudo } from '@gerbaudo/sdk-node'`; `app.use(gerbaudo({ app }))`
- Auto-discovers Express routes by inspecting `app._router.stack`
- Batches intercept records (flush every 2s or at 50 records), guarded against concurrent flush
- Intercept recording wrapped in try/catch — never crashes the backend
- SDK has no runtime dependencies — uses native `fetch`, `@types/express` is dev-only
- Install via `gerbaudo init --sdk` or `npm install ../../sdk/node`

## Architecture notes

- **ESM only** — `"type": "module"` in both packages; all imports use `.js` extension (ESM convention)
- SQLite via `better-sqlite3` (synchronous), WAL journal mode, auto-migrated on first `getDb()` call
- DB singleton has defensive stale-connection check — recreates if `SELECT 1` fails
- UUID v4 primary keys; `snake_case` in DB ↔ `camelCase` in TS
- Config discovery: searches cwd upward (up to 10 levels) for `gerbaudo.json`
- Daemon listens on `127.0.0.1` only; daemon is Express serving `/api/*` routes
- Agent endpoints (`/api/agent/endpoints`, `/api/agent/exec`) return formatted data + `"forward"` instructions — AI routing not yet implemented (`cli/src/agent/` is empty)
