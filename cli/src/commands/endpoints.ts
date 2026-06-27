import path from 'node:path'
import { Command } from 'commander'
import { loadConfig, findConfigPath } from '../config/config.js'
import { getDb } from '../storage/db.js'
import { CatalogStore } from '../storage/catalog.js'

export function createEndpointsCommand(): Command {
  const cmd = new Command('endpoints')
    .description('List discovered API endpoints')
    .option('-m, --method <method>', 'Filter by HTTP method')
    .option('-p, --path <path>', 'Filter by path (partial match)')
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
      const catalogStore = new CatalogStore(db)

      const filter = {
        method: opts.method as string | undefined,
        path: opts.path as string | undefined,
      }
      const endpoints = catalogStore.findAll(filter)

      if (opts.json) {
        console.log(JSON.stringify(endpoints, null, 2))
        return
      }

      if (endpoints.length === 0) {
        console.log('No endpoints discovered yet.')
        return
      }

      const rows = endpoints.map((e) => ({
        Method: e.method,
        Path: e.path,
        'Params': e.params ?? '-',
        'Registered': e.createdAt,
      }))
      console.table(rows)
    })

  return cmd
}
