# Gerbaudo

[![npm version](https://img.shields.io/npm/v/@gerbaudo/cli?color=blue)](https://www.npmjs.com/package/@gerbaudo/cli)
[![CI](https://github.com/gerbaudo19/gerbaudo/actions/workflows/ci.yml/badge.svg)](https://github.com/gerbaudo19/gerbaudo/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/@gerbaudo/cli)](LICENSE)
[![Node](https://img.shields.io/node/v/@gerbaudo/cli)](https://nodejs.org)

**Local CLI tool for backend API instrumentation** — discover routes, intercept traffic, and execute endpoints, all from your terminal.

<!-- TODO: add demo GIF -->
<!-- ![demo](docs/demo.gif) -->

---

## Quick start

```sh
# Install in your Express project
npx @gerbaudo/cli init

# Start the daemon
npx @gerbaudo/cli daemon

# Execute any endpoint
npx @gerbaudo/cli run GET /api/users
npx @gerbaudo/cli run POST /api/users --data '{"name":"John"}'

# Or from a file / stdin (Windows-friendly)
npx @gerbaudo/cli run POST /api/users -d @body.json
echo '{"name":"John"}' | npx @gerbaudo/cli run POST /api/users -d -
```

---

## Features

- **Auto-discovery** — detects Express routes at startup via the SDK middleware
- **CLI execution** — call any registered endpoint with path params, body, and headers
- **Traffic recording** — all requests passing through your backend are intercepted and stored
- **SQLite persistence** — no external DB needed; requests, responses, status codes, and timing stored locally
- **Query history** — inspect logs with filtering by method, status, path, and date range
- **Path parameter matching** — `/api/users/:id` automatically matches `/api/users/123`
- **Batch processing** — SDK buffers intercepts (every 2s or 50 records) with concurrency guard
- **Non-intrusive** — never crashes your backend (try/catch on all instrumentation)

---

## CLI commands

| Command            | Description                                                   |
| ------------------ | ------------------------------------------------------------- |
| `daemon`           | Start the daemon server                                       |
| `init` / `install` | Install Gerbaudo (asks for daemon port, backend URL, DB path) |
| `endpoints`        | List discovered endpoints                                     |
| `run <path>`       | Execute an endpoint                                           |
| `log [endpoint]`   | Query request history                                         |
| `stats`            | Show API usage statistics                                     |
| `export`           | Export API spec (OpenAPI) to YAML or JSON                     |

Run `npx @gerbaudo/cli <command> --help` for full flag reference.

---

## SDK

```ts
import { gerbaudo } from '@gerbaudo/sdk-node'
import express from 'express'

const app = express()
app.use(gerbaudo({ app }))
```

The SDK:

- Discovers all Express routes via `app._router.stack`
- Registers them in the daemon's catalog
- Intercepts every request/response (method, path, status, headers, body, duration)
- Batches and flushes intercept records to the daemon

### Options

```ts
app.use(
  gerbaudo({
    app, // Express app (for route discovery)
    daemonUrl: 'http://127.0.0.1:9876', // default
    batchInterval: 2000, // flush interval in ms (default: 2000)
    batchSize: 50, // max batch size (default: 50)
  }),
)
```

---

## Daemon API

The daemon listens on `http://127.0.0.1:9876` and serves these routes:

| Method | Route                   | Description                                |
| ------ | ----------------------- | ------------------------------------------ |
| `GET`  | `/api/catalog`          | List all registered endpoints              |
| `POST` | `/api/catalog/register` | Register or update an endpoint             |
| `POST` | `/api/intercept/record` | Record an intercepted request              |
| `GET`  | `/api/records`          | Query intercept records                    |
| `GET`  | `/api/records/:id`      | Get a single record                        |
| `GET`  | `/api/stats`            | Get usage statistics                       |
| `GET`  | `/api/agent/endpoints`  | Get endpoints in agent format              |
| `POST` | `/api/agent/exec`       | Get forwarding instruction for an endpoint |

---

## Configuration

`gerbaudo.json` (auto-created by `gerbaudo init`):

```json
{
  "daemonPort": 9876,
  "dbPath": ".gerbaudo/data.db",
  "backendUrl": "http://127.0.0.1:3000"
}
```

Config discovery searches the current directory upward (up to 10 levels).

---

## Development

### Prerequisites

- Node.js 18+
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
npm run dev daemon            # starts daemon with tsx (no build)
npm run dev endpoints         # list endpoints
npm run dev run /api/users    # execute endpoint
```

### Test

```sh
cd cli && npm test             # 59 unit tests (vitest)
cd sdk/node && npm test        # 7 unit tests
npx tsx test-integration.ts    # integration test (from repo root)
```

---

## Architecture notes

- **ESM only** — both packages use `"type": "module"`; all imports use `.js` extension
- **SQLite** via `better-sqlite3` (synchronous), WAL journal mode, auto-migrated
- **UUID v4** for primary keys; `snake_case` in DB ↔ `camelCase` in TypeScript
- **Daemon** binds to `127.0.0.1` only; serves `/api/*` routes via Express
- **SDK** has no runtime dependencies (`@types/express` is dev-only); uses native `fetch`
- **Agent API** stubs exist (`/api/agent/*`) but AI routing is not yet implemented

---

## License

MIT
