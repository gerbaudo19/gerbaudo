import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../storage/migrations.js'
import { CatalogStore } from '../storage/catalog.js'
import { RecordStore } from '../storage/records.js'
import { DaemonServer } from './server.js'

describe('DaemonServer', () => {
  let server: DaemonServer
  let port: number
  let db: Database.Database

  beforeAll(async () => {
    db = new Database(':memory:')
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    runMigrations(db)

    const catalog = new CatalogStore(db)
    const records = new RecordStore(db)

    server = new DaemonServer({ daemonPort: 0, dbPath: ':memory:' }, catalog, records)
    await server.start()
    port = server.getPort()
  })

  afterAll(async () => {
    await server.stop()
    db.close()
  })

  const base = () => `http://127.0.0.1:${port}`

  it('GET /api/catalog returns empty array initially', async () => {
    const r = await fetch(`${base()}/api/catalog`)
    expect(r.status).toBe(200)
    const data = await r.json()
    expect(data).toEqual([])
  })

  it('POST /api/catalog/register creates endpoint', async () => {
    const r = await fetch(`${base()}/api/catalog/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path: '/api/users' }),
    })
    expect(r.status).toBe(200)
    const data = await r.json()
    expect(data.method).toBe('GET')
    expect(data.path).toBe('/api/users')
    expect(data.id).toBeTruthy()
  })

  it('POST /api/catalog/register updates existing endpoint', async () => {
    const r = await fetch(`${base()}/api/catalog/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path: '/api/users', params: '["id"]' }),
    })
    expect(r.status).toBe(200)
    const data = await r.json()
    expect(data.params).toBe('["id"]')
  })

  it('POST /api/intercept/record creates record', async () => {
    const catalog = await (await fetch(`${base()}/api/catalog`)).json()
    const epId = catalog[0].id
    const r = await fetch(`${base()}/api/intercept/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpointId: epId, method: 'GET', path: '/api/users', status: 200, durationMs: 42 }),
    })
    expect(r.status).toBe(200)
    const data = await r.json()
    expect(data.status).toBe(200)
    expect(data.durationMs).toBe(42)
  })

  it('GET /api/catalog returns registered endpoints', async () => {
    const r = await fetch(`${base()}/api/catalog`)
    const data = await r.json()
    expect(data.length).toBe(1)
    expect(data[0].path).toBe('/api/users')
  })

  it('GET /api/records returns records', async () => {
    const r = await fetch(`${base()}/api/records`)
    const data = await r.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(1)
  })

  it('GET /api/stats returns stats object', async () => {
    const r = await fetch(`${base()}/api/stats`)
    const data = await r.json()
    expect(typeof data.totalEndpoints).toBe('number')
    expect(typeof data.totalRecords).toBe('number')
    expect(typeof data.errorCount).toBe('number')
  })

  it('GET /api/agent/endpoints returns agent format', async () => {
    const r = await fetch(`${base()}/api/agent/endpoints`)
    const data = await r.json()
    expect(data.version).toBeTruthy()
    expect(Array.isArray(data.endpoints)).toBe(true)
  })

  it('POST /api/agent/exec returns forward instruction', async () => {
    const catalog = await (await fetch(`${base()}/api/catalog`)).json()
    const r = await fetch(`${base()}/api/agent/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpointId: catalog[0].id }),
    })
    const data = await r.json()
    expect(data.instruction).toBe('forward')
  })

  it('POST /api/intercept/record rejects invalid endpointId with 500', async () => {
    const r = await fetch(`${base()}/api/intercept/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpointId: 'bogus', method: 'GET', path: '/', status: 200, durationMs: 1 }),
    })
    expect(r.status).toBe(500)
  })
})
