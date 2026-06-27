import { describe, it, expect } from 'vitest'
import { matchRoute, resolvePath } from './run.js'

describe('matchRoute', () => {
  it('matches exact paths with no params', () => {
    expect(matchRoute('/api/users', '/api/users')).toEqual({})
  })

  it('extracts a single path param', () => {
    expect(matchRoute('/api/users/:id', '/api/users/123')).toEqual({ id: '123' })
  })

  it('extracts multiple path params', () => {
    expect(matchRoute('/api/:resource/:id', '/api/users/42')).toEqual({ resource: 'users', id: '42' })
  })

  it('decodes URI components in params', () => {
    expect(matchRoute('/api/users/:name', '/api/users/John%20Doe')).toEqual({ name: 'John Doe' })
  })

  it('returns null for different lengths', () => {
    expect(matchRoute('/api/users/:id', '/api/users/123/comments')).toBeNull()
  })

  it('returns null for mismatched static segments', () => {
    expect(matchRoute('/api/users', '/api/products')).toBeNull()
  })

  it('returns null for empty pattern', () => {
    expect(matchRoute('', '/api/users')).toBeNull()
  })
})

describe('resolvePath', () => {
  it('replaces :param tokens', () => {
    expect(resolvePath('/api/users/:id', { id: '123' })).toBe('/api/users/123')
  })

  it('replaces multiple params', () => {
    expect(resolvePath('/api/:a/:b', { a: 'users', b: '42' })).toBe('/api/users/42')
  })

  it('leaves unresolved params as-is when missing', () => {
    expect(resolvePath('/api/users/:id', {})).toBe('/api/users/:id')
  })

  it('ignores extra params not in pattern', () => {
    expect(resolvePath('/api/users', { id: '123' })).toBe('/api/users')
  })

  it('handles empty pattern', () => {
    expect(resolvePath('', {})).toBe('')
  })
})
