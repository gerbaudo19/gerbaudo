import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from './migrations.js'
import { RecordStore } from './records.js'

function createStore(): { db: Database.Database; store: RecordStore; endpointId: string } {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)

  const endpointId = 'test-ep-1'
  db.prepare(
    `INSERT INTO endpoints (id, method, path, created_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
  ).run(endpointId, 'GET', '/api/users')

  return { db, store: new RecordStore(db), endpointId }
}

describe('RecordStore', () => {
  let store: RecordStore
  let endpointId: string

  beforeEach(() => {
    const ctx = createStore()
    store = ctx.store
    endpointId = ctx.endpointId
  })

  describe('insert', () => {
    it('inserts a record and returns it with id + createdAt', () => {
      const r = store.insert({
        endpointId,
        method: 'GET',
        path: '/api/users',
        status: 200,
        durationMs: 42,
      })
      expect(r.id).toBeTruthy()
      expect(r.status).toBe(200)
      expect(r.durationMs).toBe(42)
      expect(r.createdAt).toBeTruthy()
    })

    it('accepts partial data', () => {
      const r = store.insert({
        endpointId,
        method: 'POST',
        path: '/api/users',
        status: 201,
        durationMs: 0,
      })
      expect(r.id).toBeTruthy()
      expect(r.status).toBe(201)
    })
  })

  describe('findAll', () => {
    beforeEach(() => {
      store.insert({ endpointId, method: 'GET', path: '/api/users', status: 200, durationMs: 10 })
      store.insert({ endpointId, method: 'GET', path: '/api/users', status: 200, durationMs: 20 })
      store.insert({ endpointId, method: 'POST', path: '/api/users', status: 201, durationMs: 30 })
    })

    it('returns all records with no filter', () => {
      expect(store.findAll()).toHaveLength(3)
    })

    it('filters by method', () => {
      expect(store.findAll({ method: 'POST' })).toHaveLength(1)
    })

    it('filters by status', () => {
      expect(store.findAll({ status: 200 })).toHaveLength(2)
    })

    it('filters by path (LIKE)', () => {
      expect(store.findAll({ path: 'users' })).toHaveLength(3)
      expect(store.findAll({ path: 'xxxxx' })).toHaveLength(0)
    })

    it('filters by endpointId', () => {
      expect(store.findAll({ endpointId })).toHaveLength(3)
      expect(store.findAll({ endpointId: 'nope' })).toHaveLength(0)
    })

    it('respects limit', () => {
      expect(store.findAll({ limit: 2 })).toHaveLength(2)
    })

    it('returns results ordered by created_at DESC', () => {
      const results = store.findAll({ limit: 3 }) as unknown as { created_at: string }[]
      for (let i = 1; i < results.length; i++) {
        expect(new Date(results[i].created_at).getTime()).toBeLessThanOrEqual(
          new Date(results[i - 1].created_at).getTime(),
        )
      }
    })
  })

  describe('findById', () => {
    it('returns a record by id', () => {
      const r = store.insert({ endpointId, method: 'GET', path: '/api/users', status: 200, durationMs: 5 })
      const found = store.findById(r.id)
      expect(found).toBeTruthy()
      expect(found!.id).toBe(r.id)
    })

    it('returns undefined for missing id', () => {
      expect(store.findById('nope')).toBeUndefined()
    })
  })

  describe('getStats', () => {
    it('returns zeros when no data', () => {
      const stats = store.getStats()
      expect(stats.totalEndpoints).toBe(1)
      expect(stats.totalRecords).toBe(0)
      expect(stats.errorCount).toBe(0)
      expect(stats.topEndpoints).toEqual([])
      expect(stats.slowestEndpoints).toEqual([])
    })

    it('computes stats from records', () => {
      store.insert({ endpointId, method: 'GET', path: '/api/users', status: 200, durationMs: 10 })
      store.insert({ endpointId, method: 'GET', path: '/api/users', status: 500, durationMs: 200 })
      store.insert({ endpointId, method: 'GET', path: '/api/users', status: 200, durationMs: 15 })

      const stats = store.getStats()
      expect(stats.totalRecords).toBe(3)
      expect(stats.errorCount).toBe(1)
      expect(stats.topEndpoints).toHaveLength(1)
      expect(stats.topEndpoints[0].path).toBe('/api/users')
      expect(stats.slowestEndpoints).toHaveLength(1)
    })
  })
})
