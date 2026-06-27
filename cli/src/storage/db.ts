import Database from 'better-sqlite3'
import { mkdirp } from './mkdirp.js'
import { runMigrations } from './migrations.js'

let db: Database.Database | null = null

export function getDb(dbPath: string): Database.Database {
  if (db) {
    try {
      db.prepare('SELECT 1').get()
      return db
    } catch {
      db = null
    }
  }

  mkdirp(dbPath)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
