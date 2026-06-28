import type Database from 'better-sqlite3'
import { v4 as uuid } from 'uuid'
import type { InterceptRecord } from '../intercept/record.js'

export interface RecordFilter {
  endpointId?: string
  method?: string
  status?: number
  since?: string
  until?: string
  path?: string
  limit?: number
  offset?: number
}

export class RecordStore {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  insert(record: Omit<InterceptRecord, 'id' | 'createdAt'>): InterceptRecord {
    const id = uuid()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO records (id, endpoint_id, method, path, status, request_headers, request_body, response_headers, response_body, duration_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        record.endpointId,
        record.method,
        record.path,
        record.status,
        record.requestHeaders ?? null,
        record.requestBody ?? null,
        record.responseHeaders ?? null,
        record.responseBody ?? null,
        record.durationMs,
        now,
      )
    return { id, ...record, createdAt: now }
  }

  findAll(filter?: RecordFilter): InterceptRecord[] {
    let sql = 'SELECT * FROM records'
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter?.endpointId) {
      conditions.push('endpoint_id = ?')
      params.push(filter.endpointId)
    }
    if (filter?.method) {
      conditions.push('method = ?')
      params.push(filter.method)
    }
    if (filter?.status) {
      conditions.push('status = ?')
      params.push(filter.status)
    }
    if (filter?.since) {
      conditions.push('created_at >= ?')
      params.push(filter.since)
    }
    if (filter?.until) {
      conditions.push('created_at <= ?')
      params.push(filter.until)
    }
    if (filter?.path) {
      conditions.push('path LIKE ?')
      params.push(`%${filter.path}%`)
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }
    sql += ' ORDER BY created_at DESC'

    if (filter?.limit) {
      sql += ' LIMIT ?'
      params.push(filter.limit)
    }
    if (filter?.offset) {
      sql += ' OFFSET ?'
      params.push(filter.offset)
    }

    return this.db.prepare(sql).all(...params) as InterceptRecord[]
  }

  findById(id: string): InterceptRecord | undefined {
    return this.db.prepare('SELECT * FROM records WHERE id = ?').get(id) as InterceptRecord | undefined
  }

  getStats(): {
    totalEndpoints: number
    totalRecords: number
    topEndpoints: { path: string; method: string; count: number }[]
    slowestEndpoints: { path: string; method: string; avgDuration: number }[]
    errorCount: number
  } {
    const totalEndpoints = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM endpoints').get() as {
        cnt: number
      }
    ).cnt

    const totalRecords = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM records').get() as {
        cnt: number
      }
    ).cnt

    const topEndpoints = this.db
      .prepare(
        `SELECT path, method, COUNT(*) as count
         FROM records
         GROUP BY method, path
         ORDER BY count DESC
         LIMIT 10`,
      )
      .all() as { path: string; method: string; count: number }[]

    const slowestEndpoints = this.db
      .prepare(
        `SELECT path, method, AVG(duration_ms) as avgDuration
         FROM records
         WHERE duration_ms IS NOT NULL
         GROUP BY method, path
         ORDER BY avgDuration DESC
         LIMIT 10`,
      )
      .all() as { path: string; method: string; avgDuration: number }[]

    const errorCount = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM records WHERE status >= 400').get() as { cnt: number }
    ).cnt

    return {
      totalEndpoints,
      totalRecords,
      topEndpoints,
      slowestEndpoints,
      errorCount,
    }
  }
}
