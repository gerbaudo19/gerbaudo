# @gerbaudo/sdk-node

Express middleware for [Gerbaudo](https://github.com/gerbaudo19/gerbaudo) API instrumentation.

Automatically discovers Express routes and intercepts every request/response — without modifying your server logic.

```ts
import { gerbaudo } from '@gerbaudo/sdk-node'
import express from 'express'

const app = express()
app.use(gerbaudo({ app }))
```

---

## Install

```sh
npm install @gerbaudo/sdk-node
```

> Requires a running Gerbaudo daemon (`npx @gerbaudo/cli daemon`).

---

## Usage

```ts
import express from 'express'
import { gerbaudo } from '@gerbaudo/sdk-node'

const app = express()

app.use(gerbaudo({
  app,                          // Express app (enables route discovery)
  daemonUrl: 'http://127.0.0.1:9876',  // daemon address (default)
  batchInterval: 2000,          // flush interval in ms (default: 2000)
  batchSize: 50,                // max records per batch (default: 50)
}))

// Your routes — everything is instrumented automatically
app.get('/api/users', (req, res) => { ... })
app.post('/api/users', (req, res) => { ... })
```

---

## What it does

### Route discovery

When you pass `{ app }`, the middleware scans Express's internal route stack and registers every route with the Gerbaudo daemon:

```
GET  /api/users
POST /api/users
GET  /api/users/:id
PUT  /api/users/:id
```

### Request interception

Every request passing through your Express app is captured:

| Field             | Description                      |
| ----------------- | -------------------------------- |
| `method`          | HTTP method                      |
| `path`            | Route pattern (`/api/users/:id`) |
| `status`          | Response status code             |
| `durationMs`      | Response time in milliseconds    |
| `requestHeaders`  | Incoming request headers (JSON)  |
| `requestBody`     | Parsed request body (JSON)       |
| `responseHeaders` | Outgoing response headers (JSON) |
| `responseBody`    | Response body (JSON)             |

### Batch processing

Intercepts are buffered and flushed in batches to avoid overwhelming the daemon:

- Flush every **2 seconds** (configurable via `batchInterval`)
- Or when **50 records** accumulate (configurable via `batchSize`)
- Concurrent flushes are prevented — safe under high load
- On failure, records are re-queued for retry
- All instrumentation is wrapped in try/catch — **never crashes your app**

---

## Options

```ts
interface GerbaudoOptions {
  app?: { _router?: { stack: unknown[] } }
  daemonUrl?: string // default: 'http://127.0.0.1:9876'
  batchInterval?: number // default: 2000 (ms)
  batchSize?: number // default: 50
}
```

---

## Development

```sh
git clone <repo>
cd sdk/node
npm install
npm run build     # tsc → dist/
npm run dev       # run index.ts with tsx
npm test          # 7 unit tests (vitest)
```

Requires Node.js 18+.
