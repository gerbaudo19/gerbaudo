import path from 'node:path'
import { Command } from 'commander'
import { loadConfig, findConfigPath } from '../config/config.js'
import { getDb } from '../storage/db.js'
import { CatalogStore } from '../storage/catalog.js'
import { RecordStore } from '../storage/records.js'
import type { Endpoint } from '../catalog/endpoint.js'

export function matchRoute(pattern: string, actual: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const actualParts = actual.split('/')
  if (patternParts.length !== actualParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(actualParts[i])
    } else if (patternParts[i] !== actualParts[i]) {
      return null
    }
  }
  return params
}

export function resolvePath(pattern: string, params: Record<string, string>): string {
  return pattern.replace(/:(\w+)/g, (_, name) => {
    if (params[name] !== undefined) return params[name]
    return `:${name}`
  })
}

export function createRunCommand(): Command {
  const cmd = new Command('run')
    .description('Execute an API endpoint')
    .argument('<endpoint>', 'Endpoint path (e.g., /api/users or /api/users/123)')
    .option('-X, --method <method>', 'HTTP method', 'GET')
    .option('-d, --data <body>', 'Request body (JSON string)')
    .option('-H, --header <headers...>', 'Request headers (Key:Value)')
    .option('-p, --param <params...>', 'Path/query params (Key=Value). Fills :param in route first, remainder become query string.')
    .option('--json', 'Output raw JSON response')
    .action(async (endpoint, opts) => {
      const configPath = findConfigPath()
      if (!configPath) {
        console.error('No gerbaudo.json found. Run "gerbaudo init" first.')
        process.exit(1)
      }

      const config = loadConfig(configPath)
      const dbPath = path.join(
        path.dirname(configPath),
        config.dbPath,
      )

      const db = getDb(dbPath)
      const catalogStore = new CatalogStore(db)
      const recordStore = new RecordStore(db)

      const allByMethod = catalogStore.findAll({ method: opts.method })
      let match: Endpoint | undefined
      let pathParams: Record<string, string> = {}

      // 1) exact match
      match = allByMethod.find((e) => e.path === endpoint)
      if (!match) {
        // 2) pattern match with :params
        for (const candidate of allByMethod) {
          const params = matchRoute(candidate.path, endpoint)
          if (params) {
            match = candidate
            pathParams = params
            break
          }
        }
      }
      if (!match) {
        // 3) endsWith fallback (for sub-path matching)
        match = allByMethod.find((e) => e.path.endsWith(endpoint))
      }

      if (!match) {
        console.error(`Endpoint not found: ${opts.method} ${endpoint}`)
        console.error()
        const total = catalogStore.findAll().length
        if (total === 0) {
          console.error('No endpoints registered. Make sure:')
          console.error('  1. The daemon is running: npx gerbaudo daemon')
          console.error('  2. The SDK middleware is active in your backend app')
          console.error('  3. Routes have been registered: check with "gerbaudo endpoints"')
        } else {
          console.error(`Available endpoints: ${total}. Use "gerbaudo endpoints" to list them.`)
          console.error('Check the method and path spelling.')
        }
        process.exit(1)
      }

      let body: string | undefined
      if (opts.data) {
        body = opts.data
      }

      const headers: Record<string, string> = {}
      if (opts.header) {
        for (const h of opts.header as string[]) {
          const idx = h.indexOf(':')
          if (idx > 0) {
            headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim()
          }
        }
      }

      const allParams: Record<string, string> = {}
      if (opts.param) {
        for (const p of opts.param as string[]) {
          const idx = p.indexOf('=')
          if (idx > 0) {
            allParams[p.slice(0, idx)] = p.slice(idx + 1)
          }
        }
      }

      // Extracted path params take precedence over --param
      const mergedParams = { ...allParams, ...pathParams }

      // Resolve :param tokens in the path
      const resolvedPath = resolvePath(match.path, mergedParams)

      // Remaining params become query string
      const queryParams = { ...allParams }
      for (const key of Object.keys(pathParams)) {
        delete queryParams[key]
      }

      const baseUrl = `http://127.0.0.1:${config.daemonPort}`
      const url = new URL(resolvedPath, baseUrl)
      for (const [k, v] of Object.entries(queryParams)) {
        url.searchParams.set(k, v)
      }

      const start = performance.now()

      try {
        const response = await fetch(url.toString(), {
          method: match.method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ?? undefined,
        })

        const durationMs = Math.round(performance.now() - start)
        const responseBody = await response.text()

        const record = recordStore.insert({
          endpointId: match.id,
          method: match.method,
          path: match.path,
          status: response.status,
          requestHeaders: JSON.stringify(headers),
          requestBody: body,
          responseHeaders: JSON.stringify(Object.fromEntries(response.headers)),
          responseBody,
          durationMs,
        })

        if (opts.json) {
          console.log(
            JSON.stringify({
              status: response.status,
              headers: Object.fromEntries(response.headers),
              body: responseBody,
              durationMs,
              recordId: record.id,
            }),
          )
          return
        }

        console.log(`\n${response.status} ${response.statusText} (${durationMs}ms)\n`)
        try {
          const parsed = JSON.parse(responseBody)
          console.log(JSON.stringify(parsed, null, 2))
        } catch {
          console.log(responseBody)
        }
      } catch (err) {
        const msg = String(err)
        if (msg.includes('ECONNREFUSED')) {
          console.error(`Cannot connect to backend at ${baseUrl}. Is the daemon running?`)
          console.error('Start it with: npx gerbaudo daemon')
        } else if (msg.includes('fetch')) {
          console.error(`Request to ${match.method} ${match.path} failed.`)
          console.error(`Is the backend server running at ${baseUrl}?`)
        } else {
          console.error(`Request failed: ${err}`)
        }
        process.exit(1)
      }
    })

  return cmd
}
