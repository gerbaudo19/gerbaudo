import { describe, it, expect } from 'vitest'
import { buildOpenApiSpec, extractPathParams } from './export.js'
import type { Endpoint } from '../catalog/endpoint.js'

function ep(overrides: Partial<Endpoint> & { method: string; path: string }): Endpoint {
  return {
    id: 'test-id',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('extractPathParams', () => {
  it('extracts no params from static path', () => {
    expect(extractPathParams('/api/users')).toEqual([])
  })

  it('extracts single param', () => {
    expect(extractPathParams('/api/users/:id')).toEqual(['id'])
  })

  it('extracts multiple params', () => {
    expect(extractPathParams('/api/:resource/:id')).toEqual(['resource', 'id'])
  })
})

describe('buildOpenApiSpec', () => {
  it('returns valid spec for empty catalog', () => {
    const spec = buildOpenApiSpec([])
    expect(spec.openapi).toBe('3.0.3')
    expect(spec.info).toBeDefined()
    expect(spec.paths).toEqual({})
  })

  it('exports a single GET endpoint', () => {
    const spec = buildOpenApiSpec([ep({ method: 'GET', path: '/api/users' })])
    expect((spec.paths as any)['/api/users'].get).toBeDefined()
    expect((spec.paths as any)['/api/users'].get.responses['200'].description).toBe('OK')
  })

  it('groups methods under the same path', () => {
    const spec = buildOpenApiSpec([
      ep({ method: 'GET', path: '/api/users' }),
      ep({ method: 'POST', path: '/api/users' }),
    ])
    expect((spec.paths as any)['/api/users'].get).toBeDefined()
    expect((spec.paths as any)['/api/users'].post).toBeDefined()
  })

  it('adds path parameters from :param tokens', () => {
    const spec = buildOpenApiSpec([ep({ method: 'GET', path: '/api/users/:id' })])
    const params = (spec.paths as any)['/api/users/:id'].get.parameters
    expect(params).toHaveLength(1)
    expect(params[0].name).toBe('id')
    expect(params[0].in).toBe('path')
    expect(params[0].required).toBe(true)
  })

  it('uses params field over path tokens when provided', () => {
    const spec = buildOpenApiSpec([ep({ method: 'GET', path: '/api/users/:id', params: '["userId"]' })])
    const params = (spec.paths as any)['/api/users/:id'].get.parameters
    expect(params).toHaveLength(1)
    expect(params[0].name).toBe('userId')
  })

  it('includes requestBody when bodySchema is present', () => {
    const spec = buildOpenApiSpec([
      ep({
        method: 'POST',
        path: '/api/users',
        bodySchema: JSON.stringify({ type: 'object', properties: { name: { type: 'string' } } }),
      }),
    ])
    const op = (spec.paths as any)['/api/users'].post
    expect(op.requestBody.content['application/json'].schema.type).toBe('object')
  })

  it('includes responseSchema when present', () => {
    const spec = buildOpenApiSpec([
      ep({
        method: 'GET',
        path: '/api/users',
        responseSchema: JSON.stringify({ type: 'array', items: { type: 'string' } }),
      }),
    ])
    const op = (spec.paths as any)['/api/users'].get
    expect(op.responses['200'].content['application/json'].schema.type).toBe('array')
  })
})
