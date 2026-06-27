import path from 'node:path'
import { Command } from 'commander'
import { loadConfig, findConfigPath } from '../config/config.js'
import { getDb } from '../storage/db.js'
import { RecordStore } from '../storage/records.js'

export function createLogCommand(): Command {
  const cmd = new Command('log')
    .description('Query request history')
    .argument('[endpoint]', 'Endpoint path to filter')
    .option('-m, --method <method>', 'Filter by HTTP method')
    .option('-s, --status <status>', 'Filter by HTTP status code')
    .option('--since <date>', 'Start date (ISO format)')
    .option('--until <date>', 'End date (ISO format)')
    .option('-n, --limit <number>', 'Max records', '50')
    .option('--json', 'Output as JSON')
    .action((endpoint, opts) => {
      const configPath = findConfigPath()
      const config = loadConfig(configPath ?? undefined)
      const dbPath = configPath
        ? path.join(
            path.dirname(configPath),
            config.dbPath,
          )
        : config.dbPath

      const db = getDb(dbPath)
      const recordStore = new RecordStore(db)

      const records = recordStore.findAll({
        path: endpoint,
        method: opts.method,
        status: opts.status ? parseInt(opts.status, 10) : undefined,
        since: opts.since,
        until: opts.until,
        limit: parseInt(opts.limit, 10),
      })

      if (opts.json) {
        console.log(JSON.stringify(records, null, 2))
        return
      }

      if (records.length === 0) {
        console.log('No records found.')
        return
      }

      const rows = records.map((r) => ({
        ID: r.id.slice(0, 8),
        Method: r.method,
        Path: r.path,
        Status: r.status,
        'Duration (ms)': r.durationMs ?? '-',
        'Time': r.createdAt,
      }))
      console.table(rows)
    })

  return cmd
}
