import type Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { Endpoint } from '../catalog/endpoint.js'

export class CatalogStore {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  upsert(endpoint: Omit<Endpoint, 'id' | 'createdAt' | 'updatedAt'>): Endpoint {
    const existing = this.db
      .prepare('SELECT * FROM endpoints WHERE method = ? AND path = ?')
      .get(endpoint.method, endpoint.path) as Endpoint | undefined

    if (existing) {
      this.db
        .prepare(
          'UPDATE endpoints SET params = ?, body_schema = ?, response_schema = ?, updated_at = datetime(\'now\') WHERE id = ?',
        )
        .run(
          endpoint.params ?? null,
          endpoint.bodySchema ?? null,
          endpoint.responseSchema ?? null,
          existing.id,
        )
      return {
        ...existing,
        params: endpoint.params ?? existing.params,
        bodySchema: endpoint.bodySchema ?? existing.bodySchema,
        responseSchema: endpoint.responseSchema ?? existing.responseSchema,
        updatedAt: new Date().toISOString(),
      }
    }

    const id = uuid()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO endpoints (id, method, path, params, body_schema, response_schema, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        endpoint.method,
        endpoint.path,
        endpoint.params ?? null,
        endpoint.bodySchema ?? null,
        endpoint.responseSchema ?? null,
        now,
        now,
      )
    return { id, ...endpoint, createdAt: now, updatedAt: now }
  }

  findAll(filter?: { method?: string; path?: string }): Endpoint[] {
    let sql = 'SELECT * FROM endpoints'
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.method) {
      conditions.push('method = ?')
      params.push(filter.method)
    }
    if (filter?.path) {
      conditions.push('path LIKE ?')
      params.push(`%${filter.path}%`)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY method, path'

    return this.db.prepare(sql).all(...params) as Endpoint[]
  }

  findById(id: string): Endpoint | undefined {
    return this.db
      .prepare('SELECT * FROM endpoints WHERE id = ?')
      .get(id) as Endpoint | undefined
  }

  findByMethodAndPath(method: string, path: string): Endpoint | undefined {
    return this.db
      .prepare('SELECT * FROM endpoints WHERE method = ? AND path = ?')
      .get(method, path) as Endpoint | undefined
  }
}
