# Gerbaudo

**Local CLI tool for backend API instrumentation.**

Gerbaudo helps you discover, execute, and monitor your backend API endpoints — all from the terminal, without modifying your server's logic.

```sh
# Install in your project
npx gerbaudo init

# Start the daemon
npx gerbaudo daemon

# Execute any endpoint
gerbaudo run GET /api/users
gerbaudo run POST /api/users --data '{"name":"John"}'
```

---

## Features

- **Automatic endpoint discovery** — detects Express routes at startup via the SDK middleware
- **Execute endpoints from CLI** — call any registered endpoint with params, body, and headers
- **Path parameter support** — `/api/users/:id` matches `/api/users/123` automatically
- **Request interception** — all traffic passing through your backend is recorded
- **SQLite persistence** — requests, responses, status codes, and timing stored locally
- **Query history** — inspect logs, filter by method/status/date, view stats
- **Batch processing** — SDK buffers intercepts (every 2s or 50 records) with concurrency guard
- **Non-intrusive** — never crashes your backend (try/catch on all instrumentation)

---

## Quick start

### 1. Install

```sh
# In your project directory
npx @gerbaudo/cli init
```

This creates `gerbaudo.json` and a `.gerbaudo/` data directory.

### 2. Start the daemon

```sh
npx gerbaudo daemon
```

The daemon listens on `http://127.0.0.1:9876` and serves the API that the CLI and SDK talk to.

### 3. (Optional) Install the Node SDK for auto-discovery

```sh
npx gerbaudo init --sdk
```

Then add the middleware to your Express app:

```ts
import { gerbaudo } from '@gerbaudo/sdk-node'
import express from 'express'

const app = express()
app.use(gerbaudo({ app }))   // auto-discovers routes + intercepts requests
```

The SDK automatically:
- Discovers all Express routes via `app._router.stack`
- Registers them in the daemon's catalog
- Intercepts every request/response (method, path, status, headers, body, duration)
- Batches and flushes intercept records to the daemon

---

## CLI commands

All commands run via `npx gerbaudo <command>`.

| Command | Description |
|---|---|
| `daemon` | Start the daemon server |
| `init` / `install` | Install Gerbaudo in the current project |
| `endpoints` | List discovered endpoints |
| `run <path>` | Execute an endpoint |
| `log [endpoint]` | Query request history |
| `stats` | Show API usage statistics |

### daemon

```sh
gerbaudo daemon
gerbaudo daemon --port 8080
gerbaudo daemon --port 8080 --db /data/my-project.db
```

- Default port: `9876` (configurable in `gerbaudo.json`)
- `--db` resolves relative to the current working directory
- Listens on `127.0.0.1` only

### init

```sh
gerbaudo init              # create config + data dir
gerbaudo init --port 8080  # custom daemon port
gerbaudo init --sdk        # also install the Node SDK
```

### run

```sh
gerbaudo run /api/users               # GET /api/users
gerbaudo run -X POST /api/users       # POST /api/users
gerbaudo run /api/users/123           # matches /api/users/:id
gerbaudo run /api/users --param id=123 --param sort=asc
gerbaudo run -X POST /api/users -d '{"name":"John"}' -H "Authorization:Bearer xyz"
gerbaudo run /api/users --json       # raw JSON output
```

- Path params (`:id`) are matched and substituted automatically
- `--param` values fill path params first; remaining become query params
- `-d / --data` accepts a JSON string as request body
- `-H / --header` accepts `Key:Value` pairs (repeatable)

### endpoints

```sh
gerbaudo endpoints                           # all endpoints (table)
gerbaudo endpoints -m GET                    # filter by method
gerbaudo endpoints -p /api/users             # filter by path (partial)
gerbaudo endpoints --json                    # raw JSON output
```

### log

```sh
gerbaudo log                                 # last 50 records
gerbaudo log /api/users                      # filter by path
gerbaudo log -m POST                         # filter by method
gerbaudo log -s 500                          # filter by status
gerbaudo log --since 2026-01-01 --until 2026-06-01
gerbaudo log -n 100                          # max records
gerbaudo log --json                          # raw JSON output
```

### stats

```sh
gerbaudo stats                               # summary table
gerbaudo stats --json                        # raw JSON
```

Shows total endpoints, total requests, error count (4xx+), top endpoints, and slowest endpoints.

---

## Project structure

```
├── cli/                   @gerbaudo/cli
│   ├── src/
│   │   ├── index.ts              CLI entrypoint (commander)
│   │   ├── commands/             CLI subcommands
│   │   │   ├── daemon.ts         daemon command
│   │   │   ├── endpoints.ts      endpoint listing
│   │   │   ├── install.ts        init/install command
│   │   │   ├── log.ts            request history
│   │   │   ├── run.ts            endpoint execution
│   │   │   └── stats.ts          usage statistics
│   │   ├── daemon/               Express server
│   │   │   ├── server.ts         daemon HTTP server
│   │   │   └── router.ts         API route handlers
│   │   ├── storage/              SQLite layer
│   │   │   ├── db.ts             connection singleton
│   │   │   ├── migrations.ts     schema migrations
│   │   │   ├── catalog.ts        endpoint CRUD
│   │   │   ├── records.ts        intercept record CRUD
│   │   │   └── mkdirp.ts         directory creation
│   │   ├── config/
│   │   │   └── config.ts         gerbaudo.json loader
│   │   ├── catalog/
│   │   │   └── endpoint.ts       Endpoint type
│   │   └── intercept/
│   │       └── record.ts         InterceptRecord type
│   └── package.json
│
├── sdk/node/              @gerbaudo/sdk-node
│   ├── src/
│   │   ├── index.ts              public API (gerbaudo function)
│   │   ├── middleware.ts         Express middleware
│   │   ├── client.ts             GerbaudoClient (batch + flush)
│   │   └── types.ts              shared types
│   └── package.json
│
├── test-integration.ts    End-to-end integration test
├── AGENTS.md              Agent instructions file
└── README.md              This file
```

---

## API routes (daemon)

The daemon exposes these HTTP endpoints under `/api`:

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/catalog` | List all registered endpoints |
| `POST` | `/api/catalog/register` | Register or update an endpoint |
| `POST` | `/api/intercept/record` | Record an intercepted request |
| `GET` | `/api/records` | Query intercept records |
| `GET` | `/api/records/:id` | Get a single record |
| `GET` | `/api/stats` | Get usage statistics |
| `GET` | `/api/agent/endpoints` | Get endpoints in agent format |
| `POST` | `/api/agent/exec` | Get forwarding instruction for an endpoint |

---

## Configuration

`gerbaudo.json` (auto-created by `gerbaudo init`):

```json
{
  "daemonPort": 9876,
  "dbPath": ".gerbaudo/data.db"
}
```

Config discovery searches the current directory upward (up to 10 levels).

---

## SDK reference

### `gerbaudo(opts?)`

Creates Express middleware that:
1. Auto-discovers routes if `opts.app` is provided
2. Intercepts all requests/responses
3. Batches and sends intercept data to the daemon

```ts
import { gerbaudo } from '@gerbaudo/sdk-node'

app.use(gerbaudo({
  app,                    // Express app (for route discovery)
  daemonUrl: 'http://127.0.0.1:9876',  // default
  batchInterval: 2000,    // flush interval in ms (default: 2000)
  batchSize: 50,          // max batch size (default: 50)
}))
```

---

## Development

### Prerequisites

- Node.js 18+ (for native `fetch`)
- npm

### Setup

```sh
cd cli
npm install
npm run build

cd ../sdk/node
npm install
npm run build
```

### Run in dev mode

```sh
cd cli
npm run dev daemon          # starts daemon with tsx (no build needed)

# In another terminal
cd cli
npm run dev endpoints       # list endpoints
npm run dev run /api/users  # execute endpoint
```

### Test

```sh
cd cli && npm test           # 49 unit tests
cd sdk/node && npm test      # 7 unit tests
cd cli && npx tsx ../test-integration.ts  # integration test
```

### Build

```sh
cd cli && npm run build
cd sdk/node && npm run build
```

TypeScript outputs to `dist/` in each package.

---

## Architecture notes

- **ESM only** — both packages use `"type": "module"`
- All imports use `.js` extensions (ESM convention)
- SQLite via `better-sqlite3` (synchronous), WAL journal mode, auto-migrated
- UUID v4 for primary keys
- `snake_case` in database columns, `camelCase` in TypeScript
- Daemon binds to `127.0.0.1` only (localhost)
- Agent API stubs exist (`/api/agent/*`) but AI routing is not yet implemented

---

## License

MIT
