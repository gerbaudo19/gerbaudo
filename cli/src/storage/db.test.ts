import { describe, it, expect, afterAll } from 'vitest'
import { getDb, closeDb } from './db.js'

describe('getDb', () => {
  afterAll(() => {
    closeDb()
  })

  it('creates database with WAL mode and applies migrations', () => {
    const db = getDb(':memory:')
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
      name: string
    }[]
    const names = tables.map((t) => t.name)
    expect(names).toContain('endpoints')
    expect(names).toContain('records')
    expect(names).toContain('_migrations')
  })

  it('returns singleton on repeated calls', () => {
    const a = getDb(':memory:')
    const b = getDb(':memory:')
    expect(a).toBe(b)
  })

  it('recreates connection after closeDb', () => {
    closeDb()
    const db = getDb(':memory:')
    const row = db.prepare('SELECT 1 as v').get() as { v: number }
    expect(row.v).toBe(1)
  })
})
