# @gerbaudo/cli

CLI tool for backend API instrumentation. Discover, execute, and monitor your API endpoints from the terminal.

```sh
npx @gerbaudo/cli init
npx @gerbaudo/cli daemon
```

---

## Install

```sh
npx @gerbaudo/cli init
```

Creates `gerbaudo.json` and a `.gerbaudo/` data directory in your project.

### Global install (optional)

```sh
npm install -g @gerbaudo/cli
gerbaudo init
```

---

## Commands

### daemon

Start the daemon server that stores endpoint catalogs and intercept records.

```sh
gerbaudo daemon
gerbaudo daemon --port 8080
gerbaudo daemon --port 8080 --db /data/my-project.db
```

- Default port: `9876`
- `--db` resolves relative to the current working directory
- Listens on `127.0.0.1` only

### run

Execute a registered endpoint against your backend.

```sh
gerbaudo run /api/users                  # GET /api/users
gerbaudo run -X POST /api/users          # POST /api/users
gerbaudo run /api/users/123              # matches /api/users/:id
gerbaudo run /api/users --param id=123 --param sort=asc
gerbaudo run -X POST /api/users -d '{"name":"John"}' -H "Authorization:Bearer xyz"
gerbaudo run /api/users --json           # raw JSON output
```

- Path params (`:id`) are matched and substituted automatically
- `--param` fills path params first; remaining keys become query string
- `-d / --data` accepts a JSON string as request body
- `-H / --header` accepts `Key:Value` pairs (repeatable)

### endpoints

List discovered endpoints.

```sh
gerbaudo endpoints                         # all endpoints (table)
gerbaudo endpoints -m GET                  # filter by method
gerbaudo endpoints -p /api/users           # filter by path (partial match)
gerbaudo endpoints --json                  # raw JSON
```

### log

Query request history.

```sh
gerbaudo log                               # last 50 records
gerbaudo log /api/users                    # filter by path
gerbaudo log -m POST                       # filter by method
gerbaudo log -s 500                        # filter by status code
gerbaudo log --since 2026-01-01 --until 2026-06-01
gerbaudo log -n 100                        # max records
gerbaudo log --json                        # raw JSON
```

### stats

Show API usage statistics.

```sh
gerbaudo stats                             # summary table
gerbaudo stats --json                      # raw JSON
```

Shows total endpoints, total requests, error count (4xx+), top endpoints, and slowest endpoints.

### init / install

Install Gerbaudo in the current project.

```sh
gerbaudo init                              # create config + data dir
gerbaudo init --port 8080                  # custom daemon port
gerbaudo init --sdk                        # also install @gerbaudo/sdk-node
```

---

## Configuration

`gerbaudo.json` (auto-created by `gerbaudo init`):

```json
{
  "daemonPort": 9876,
  "dbPath": ".gerbaudo/data.db"
}
```

Config discovery searches the current directory upward (up to 10 levels) for `gerbaudo.json`.

---

## Daemon API

The daemon exposes these endpoints under `/api`:

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/catalog` | List registered endpoints |
| `POST` | `/api/catalog/register` | Register or update an endpoint |
| `POST` | `/api/intercept/record` | Record an intercepted request |
| `GET` | `/api/records` | Query intercept records |
| `GET` | `/api/records/:id` | Get a single record |
| `GET` | `/api/stats` | Get usage statistics |
| `GET` | `/api/agent/endpoints` | Endpoints in agent format |
| `POST` | `/api/agent/exec` | Forward instruction for an endpoint |

---

## Development

```sh
git clone <repo>
cd cli
npm install
npm run build          # tsc → dist/
npm run dev daemon     # run with tsx (no build needed)
npm test               # 49 unit tests (vitest)
```

Requires Node.js 18+.
