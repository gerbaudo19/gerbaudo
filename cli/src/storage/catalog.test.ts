import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from './migrations.js'
import { CatalogStore } from './catalog.js'

function createStore(): CatalogStore {
  const db = new Database(':memory:')
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  return new CatalogStore(db)
}

describe('CatalogStore', () => {
  let store: CatalogStore

  beforeEach(() => {
    store = createStore()
  })

  describe('upsert', () => {
    it('creates a new endpoint', () => {
      const ep = store.upsert({ method: 'GET', path: '/api/users' })
      expect(ep.id).toBeTruthy()
      expect(ep.method).toBe('GET')
      expect(ep.path).toBe('/api/users')
      expect(ep.createdAt).toBeTruthy()
      expect(ep.updatedAt).toBeTruthy()
    })

    it('updates an existing endpoint (same method + path)', () => {
      const created = store.upsert({ method: 'GET', path: '/api/users', params: '["id"]' })
      const updated = store.upsert({ method: 'GET', path: '/api/users', params: '["id","name"]' })
      expect(updated.id).toBe(created.id)
      expect(updated.params).toBe('["id","name"]')
    })

    it('creates separate entries for different methods', () => {
      const a = store.upsert({ method: 'GET', path: '/api/users' })
      const b = store.upsert({ method: 'POST', path: '/api/users' })
      expect(a.id).not.toBe(b.id)
    })
  })

  describe('findAll', () => {
    beforeEach(() => {
      store.upsert({ method: 'GET', path: '/api/users' })
      store.upsert({ method: 'POST', path: '/api/users' })
      store.upsert({ method: 'GET', path: '/api/products' })
    })

    it('returns all endpoints with no filter', () => {
      const all = store.findAll()
      expect(all).toHaveLength(3)
    })

    it('filters by method', () => {
      const results = store.findAll({ method: 'GET' })
      expect(results).toHaveLength(2)
      results.forEach(e => expect(e.method).toBe('GET'))
    })

    it('filters by path (LIKE)', () => {
      const results = store.findAll({ path: 'users' })
      expect(results).toHaveLength(2)
    })

    it('filters by method + path', () => {
      const results = store.findAll({ method: 'GET', path: 'products' })
      expect(results).toHaveLength(1)
      expect(results[0].path).toBe('/api/products')
    })
  })

  describe('findById', () => {
    it('returns the endpoint when found', () => {
      const ep = store.upsert({ method: 'GET', path: '/api/foo' })
      const found = store.findById(ep.id)
      expect(found).toBeTruthy()
      expect(found!.id).toBe(ep.id)
    })

    it('returns undefined when not found', () => {
      const found = store.findById('nonexistent')
      expect(found).toBeUndefined()
    })
  })

  describe('findByMethodAndPath', () => {
    it('finds matching endpoint', () => {
      store.upsert({ method: 'DELETE', path: '/api/bar' })
      const found = store.findByMethodAndPath('DELETE', '/api/bar')
      expect(found).toBeTruthy()
      expect(found!.method).toBe('DELETE')
    })

    it('returns undefined when no match', () => {
      const found = store.findByMethodAndPath('GET', '/api/nope')
      expect(found).toBeUndefined()
    })
  })
})
