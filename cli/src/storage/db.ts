import Database from 'better-sqlite3'
import { ensureParentDir } from './mkdirp.js'
import { runMigrations } from './migrations.js'

const connections = new Map<string, Database.Database>()

export function getDb(dbPath: string): Database.Database {
  const existing = connections.get(dbPath)
  if (existing) {
    try {
      existing.prepare('SELECT 1').get()
      return existing
    } catch {
      existing.close()
      connections.delete(dbPath)
    }
  }

  ensureParentDir(dbPath)

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  connections.set(dbPath, db)
  return db
}

export function closeDb(dbPath?: string): void {
  if (dbPath) {
    const db = connections.get(dbPath)
    if (db) {
      db.close()
      connections.delete(dbPath)
    }
  } else {
    for (const db of connections.values()) {
      db.close()
    }
    connections.clear()
  }
}
