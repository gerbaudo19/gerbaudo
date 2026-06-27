import { Router } from 'express'
import type { CatalogStore } from '../storage/catalog.js'
import type { RecordStore } from '../storage/records.js'

export function createRouter(
  catalogStore: CatalogStore,
  recordStore: RecordStore,
): Router {
  const router = Router()

  router.post('/catalog/register', (req, res) => {
    const { method, path, params, bodySchema, responseSchema } = req.body
    if (!method || !path) {
      res.status(400).json({ error: 'method and path are required' })
      return
    }
    const endpoint = catalogStore.upsert({
      method,
      path,
      params,
      bodySchema,
      responseSchema,
    })
    res.json(endpoint)
  })

  router.get('/catalog', (req, res) => {
    const filter = {
      method: req.query.method as string | undefined,
      path: req.query.path as string | undefined,
    }
    const endpoints = catalogStore.findAll(filter)
    res.json(endpoints)
  })

  router.post('/intercept/record', (req, res) => {
    const {
      endpointId,
      method,
      path,
      status,
      requestHeaders,
      requestBody,
      responseHeaders,
      responseBody,
      durationMs,
    } = req.body
    if (!method || !path || status === undefined) {
      res.status(400).json({ error: 'method, path, and status are required' })
      return
    }
    const record = recordStore.insert({
      endpointId,
      method,
      path,
      status,
      requestHeaders,
      requestBody,
      responseHeaders,
      responseBody,
      durationMs,
    })
    res.json(record)
  })

  router.get('/records', (req, res) => {
    const filter = {
      endpointId: req.query.endpointId as string | undefined,
      method: req.query.method as string | undefined,
      status: req.query.status ? Number(req.query.status) : undefined,
      since: req.query.since as string | undefined,
      until: req.query.until as string | undefined,
      path: req.query.path as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    }
    const records = recordStore.findAll(filter)
    res.json(records)
  })

  router.get('/records/:id', (req, res) => {
    const record = recordStore.findById(req.params.id)
    if (!record) {
      res.status(404).json({ error: 'record not found' })
      return
    }
    res.json(record)
  })

  router.get('/stats', (_req, res) => {
    const stats = recordStore.getStats()
    res.json(stats)
  })

  router.get('/agent/endpoints', (req, res) => {
    const filter = {
      method: req.query.method as string | undefined,
      path: req.query.path as string | undefined,
    }
    const endpoints = catalogStore.findAll(filter)
    res.json({
      version: '0.1.0',
      endpoints: endpoints.map((e) => ({
        id: e.id,
        method: e.method,
        path: e.path,
        params: e.params,
        bodySchema: e.bodySchema,
        responseSchema: e.responseSchema,
      })),
    })
  })

  router.post('/agent/exec', (req, res) => {
    const { endpointId, body, params, headers } = req.body
    if (!endpointId) {
      res.status(400).json({ error: 'endpointId is required' })
      return
    }
    const endpoint = catalogStore.findById(endpointId)
    if (!endpoint) {
      res.status(404).json({ error: 'endpoint not found' })
      return
    }
    res.json({
      instruction: 'forward',
      method: endpoint.method,
      path: endpoint.path,
      params,
      body,
      headers,
    })
  })

  return router
}
