import path from 'node:path'
import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { loadConfig, findConfigPath } from '../config/config.js'
import { getDb } from '../storage/db.js'
import { CatalogStore } from '../storage/catalog.js'

function colorMethod(method: string): string {
  switch (method) {
    case 'GET':
      return chalk.green(method)
    case 'POST':
      return chalk.blue(method)
    case 'PUT':
      return chalk.yellow(method)
    case 'PATCH':
      return chalk.magenta(method)
    case 'DELETE':
      return chalk.red(method)
    default:
      return method
  }
}

export function createEndpointsCommand(): Command {
  const cmd = new Command('endpoints')
    .description('List discovered API endpoints')
    .option('-m, --method <method>', 'Filter by HTTP method')
    .option('-p, --path <path>', 'Filter by path (partial match)')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const configPath = findConfigPath()
      const config = loadConfig(configPath ?? undefined)
      const dbPath = configPath ? path.join(path.dirname(configPath), config.dbPath) : config.dbPath

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
        console.log(chalk.yellow('No endpoints discovered yet.'))
        return
      }

      const table = new Table({
        head: [chalk.cyan('Method'), chalk.cyan('Path'), chalk.cyan('Params'), chalk.cyan('Registered')],
        style: { head: [] },
      })

      for (const e of endpoints) {
        table.push([colorMethod(e.method), e.path, e.params ?? '-', e.createdAt])
      }

      console.log(table.toString())
    })

  return cmd
}
