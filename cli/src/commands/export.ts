import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { Command } from 'commander'
import chalk from 'chalk'
import YAML from 'yaml'
import { loadConfig, findConfigPath } from '../config/config.js'
import { getDb } from '../storage/db.js'
import { CatalogStore } from '../storage/catalog.js'
import type { Endpoint } from '../catalog/endpoint.js'

export function extractPathParams(routePath: string): string[] {
  const params: string[] = []
  for (const segment of routePath.split('/')) {
    if (segment.startsWith(':')) {
      params.push(segment.slice(1))
    }
  }
  return params
}

function tryParseJson(raw: string | undefined): unknown | undefined {
  if (!raw) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function buildOpenApiSpec(endpoints: Endpoint[]): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {}

  for (const ep of endpoints) {
    const method = ep.method.toLowerCase()
    if (!paths[ep.path]) {
      paths[ep.path] = {}
    }

    const operation: Record<string, unknown> = {
      responses: {
        '200': { description: 'OK' },
      },
    }

    const paramNames = ep.params ? (tryParseJson(ep.params) as string[] | undefined) : extractPathParams(ep.path)

    if (paramNames && paramNames.length > 0) {
      operation.parameters = paramNames.map((name) => ({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      }))
    }

    const bodySchema = tryParseJson(ep.bodySchema)
    if (bodySchema) {
      operation.requestBody = {
        content: {
          'application/json': {
            schema: bodySchema,
          },
        },
      }
    }

    const responseSchema = tryParseJson(ep.responseSchema)
    if (responseSchema) {
      operation.responses = {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: responseSchema,
            },
          },
        },
      }
    }

    paths[ep.path][method] = operation
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'API',
      version: '0.1.0',
    },
    paths,
  }
}

export function createExportCommand(): Command {
  const cmd = new Command('export')
    .description('Export API spec (OpenAPI, etc.)')
    .option('-f, --format <format>', 'Export format', 'openapi')
    .option('-o, --output <path>', 'Output file path (prints to stdout if omitted)')
    .option('--json', 'Output JSON instead of YAML (only for openapi format)')
    .action((opts) => {
      if (opts.format !== 'openapi') {
        console.error(chalk.red(`Unknown format: "${opts.format}". Supported: openapi`))
        process.exit(1)
      }

      const configPath = findConfigPath()
      const config = loadConfig(configPath ?? undefined)
      const dbPath = configPath ? path.join(path.dirname(configPath), config.dbPath) : config.dbPath

      const db = getDb(dbPath)
      const catalogStore = new CatalogStore(db)
      const endpoints = catalogStore.findAll()

      const spec = buildOpenApiSpec(endpoints)

      const output = opts.json ? JSON.stringify(spec, null, 2) : YAML.stringify(spec)

      if (opts.output) {
        writeFileSync(opts.output, output, 'utf-8')
        console.log(chalk.green(`Exported to ${opts.output}`))
      } else {
        console.log(output)
      }
    })

  return cmd
}
