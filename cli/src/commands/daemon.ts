import path from 'node:path'
import { Command } from 'commander'
import { loadConfig, findConfigPath } from '../config/config.js'
import { getDb, closeDb } from '../storage/db.js'
import { CatalogStore } from '../storage/catalog.js'
import { RecordStore } from '../storage/records.js'
import { DaemonServer } from '../daemon/server.js'

export function createDaemonCommand(): Command {
  const cmd = new Command('daemon')
    .description('Start the Gerbaudo daemon server')
    .option('-p, --port <number>', 'Port to listen on')
    .option('--db <path>', 'Path to SQLite database file')
    .action(async (opts) => {
      const configPath = findConfigPath()
      const config = loadConfig(configPath ?? undefined)

      if (opts.port) config.daemonPort = parseInt(opts.port, 10)

      const dbPath = opts.db
        ? path.resolve(opts.db)
        : configPath
          ? path.join(path.dirname(configPath), config.dbPath)
          : config.dbPath

      const db = getDb(dbPath)
      const catalogStore = new CatalogStore(db)
      const recordStore = new RecordStore(db)

      const server = new DaemonServer(config, catalogStore, recordStore)

      try {
        await server.start()
        console.log(`Gerbaudo daemon listening on http://127.0.0.1:${server.getPort()}`)
      } catch (err) {
        console.error('Failed to start daemon:', err)
        closeDb()
        process.exit(1)
      }

      process.on('SIGINT', async () => {
        await server.stop()
        closeDb()
        process.exit(0)
      })

      process.on('SIGTERM', async () => {
        await server.stop()
        closeDb()
        process.exit(0)
      })
    })

  return cmd
}
