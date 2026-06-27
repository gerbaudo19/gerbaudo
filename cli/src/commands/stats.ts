import path from 'node:path'
import { Command } from 'commander'
import { loadConfig, findConfigPath } from '../config/config.js'
import { getDb } from '../storage/db.js'
import { RecordStore } from '../storage/records.js'

export function createStatsCommand(): Command {
  const cmd = new Command('stats')
    .description('Show API usage statistics')
    .option('--json', 'Output as JSON')
    .action((opts) => {
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
      const stats = recordStore.getStats()

      if (opts.json) {
        console.log(JSON.stringify(stats, null, 2))
        return
      }

      console.log('=== Gerbaudo Stats ===')
      console.log(`Total endpoints: ${stats.totalEndpoints}`)
      console.log(`Total requests:  ${stats.totalRecords}`)
      console.log(`Errors (4xx+):   ${stats.errorCount}`)
      console.log()

      if (stats.topEndpoints.length > 0) {
        console.log('Top endpoints:')
        console.table(stats.topEndpoints)
      }

      if (stats.slowestEndpoints.length > 0) {
        console.log('Slowest endpoints (avg ms):')
        console.table(stats.slowestEndpoints)
      }
    })

  return cmd
}
