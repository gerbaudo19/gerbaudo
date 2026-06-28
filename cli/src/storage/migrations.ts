import type Database from 'better-sqlite3'

const migrations = [
  // 0: tracking table
  `
  CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    applied_at TEXT DEFAULT (datetime('now'))
  );
  `,
  // 1: endpoints
  `
  CREATE TABLE IF NOT EXISTS endpoints (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    params TEXT,
    body_schema TEXT,
    response_schema TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(method, path)
  );
  `,
  // 2: records
  `
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    endpoint_id TEXT REFERENCES endpoints(id),
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    request_headers TEXT,
    request_body TEXT,
    response_headers TEXT,
    response_body TEXT,
    duration_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  `,
  // 3: indexes
  `
  CREATE INDEX IF NOT EXISTS idx_records_endpoint ON records(endpoint_id);
  `,
  `
  CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at);
  `,
]

export function runMigrations(db: Database.Database): void {
  // ensure _migrations table exists first
  db.exec(migrations[0])

  const row = db.prepare('SELECT COUNT(*) as cnt FROM _migrations').get() as { cnt: number }

  const applied = row?.cnt ?? 0

  for (let i = applied; i < migrations.length; i++) {
    db.exec(migrations[i])
    if (i > 0) {
      db.prepare('INSERT INTO _migrations DEFAULT VALUES').run()
    }
  }
}
