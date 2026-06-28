import express, { type Request, type Response, type NextFunction } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { CatalogStore } from '../storage/catalog.js'
import type { RecordStore } from '../storage/records.js'
import type { GerbaudoConfig } from '../config/config.js'
import { createRouter } from './router.js'

export class DaemonServer {
  private app: express.Application
  private server: HttpServer | null = null
  private port: number

  constructor(config: GerbaudoConfig, catalogStore: CatalogStore, recordStore: RecordStore) {
    this.port = config.daemonPort
    this.app = express()
    this.app.use(express.json())
    this.app.use('/api', createRouter(catalogStore, recordStore))
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Daemon error:', err)
      res.status(500).json({ error: 'Internal server error' })
    })
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, '127.0.0.1', () => {
        const addr = this.server!.address()
        if (addr && typeof addr === 'object') {
          this.port = addr.port
        }
        resolve()
      })
      this.server.on('error', reject)
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve()
        return
      }
      this.server.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  getPort(): number {
    return this.port
  }
}
