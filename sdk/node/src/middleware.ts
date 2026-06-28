import type { Request, Response, NextFunction } from 'express'
import { GerbaudoClient } from './client.js'
import type { GerbaudoOptions } from './types.js'

function extractRoutePath(req: Request): string {
  return (req.route?.path as string) ?? req.path
}

function getCircularReplacer(): (this: unknown, _key: string, value: unknown) => unknown {
  const seen = new WeakSet()
  return function (_key: string, value: unknown): unknown {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]'
      seen.add(value)
    }
    return value
  }
}

export function createMiddleware(opts?: GerbaudoOptions) {
  const client = new GerbaudoClient({
    daemonUrl: opts?.daemonUrl,
    batchInterval: opts?.batchInterval,
    batchSize: opts?.batchSize,
  })

  client.start()

  let discovered = false

  function discoverRoutes(app: { _router?: { stack: unknown[] } }): void {
    if (!app._router?.stack) return

    for (const layer of app._router.stack) {
      if ((layer as any).route) {
        const route = (layer as any).route
        const methods = Object.keys(route.methods)
        for (const method of methods) {
          client.registerEndpoint({
            method: method.toUpperCase(),
            path: route.path,
          })
        }
      }
    }
  }

  function safeStringify(val: unknown): string {
    try {
      return JSON.stringify(val, getCircularReplacer())
    } catch {
      return String(val)
    }
  }

  function middleware(req: Request, res: Response, next: NextFunction): void {
    if (!discovered && opts?.app) {
      discoverRoutes(opts.app)
      discovered = true
    }

    const start = performance.now()

    let responseBody: unknown = null

    const _json = res.json.bind(res) as any
    const _send = res.send.bind(res) as any
    const _end = res.end.bind(res) as any

    res.json = function (body: unknown, ...args: unknown[]) {
      responseBody = body
      return _json(body, ...args)
    } as any

    res.send = function (body: unknown, ...args: unknown[]) {
      responseBody = body ?? responseBody
      return _send(body, ...args)
    } as any

    res.end = function (chunk: unknown, ...args: unknown[]) {
      try {
        const durationMs = Math.round(performance.now() - start)
        const path = extractRoutePath(req)
        const endpointId = client.getEndpointId(req.method, path)

        client.recordIntercept({
          endpointId,
          method: req.method.toUpperCase(),
          path,
          status: res.statusCode,
          requestHeaders: safeStringify(req.headers),
          requestBody: safeStringify(req.body),
          responseHeaders: safeStringify(res.getHeaders()),
          responseBody: typeof responseBody === 'string' ? responseBody : safeStringify(responseBody),
          durationMs,
        })
      } catch {
        // never crash the backend because of instrumentation
      }

      return _end(chunk, ...args)
    } as any

    next()
  }

  middleware.discover = discoverRoutes
  middleware.stop = () => client.stop()

  return middleware
}
