import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GerbaudoClient } from './client.js'

describe('GerbaudoClient', () => {
  let client: GerbaudoClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()
    client = new GerbaudoClient({ daemonUrl: 'http://127.0.0.1:9999', batchInterval: 5000, batchSize: 10 })
  })

  afterEach(() => {
    client.stop()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('start / stop', () => {
    it('starts a timer that flushes on interval', () => {
      client.start()
      expect(fetchMock).not.toHaveBeenCalled()
      vi.advanceTimersByTime(5000)
      expect(fetchMock).not.toHaveBeenCalled() // nothing to flush
    })

    it('flushes remaining items on stop', () => {
      client.start()
      client.recordIntercept({
        endpointId: 'ep1', method: 'GET', path: '/api/test', status: 200, durationMs: 10,
      })
      client.stop()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('registerEndpoint', () => {
    it('POSTs to daemon and deduplicates', async () => {
      await client.registerEndpoint({ method: 'GET', path: '/api/users' })
      expect(fetchMock).toHaveBeenCalledTimes(1)

      await client.registerEndpoint({ method: 'GET', path: '/api/users' })
      expect(fetchMock).toHaveBeenCalledTimes(1) // dedup
    })

    it('does not throw when daemon is unreachable', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))
      await expect(client.registerEndpoint({ method: 'GET', path: '/api/test' })).resolves.toBeUndefined()
    })
  })

  describe('recordIntercept', () => {
    it('queues items and flushes when batch size is reached', () => {
      client.start()
      for (let i = 0; i < 10; i++) {
        client.recordIntercept({
          endpointId: `ep${i}`, method: 'GET', path: '/api/test', status: 200, durationMs: i,
        })
      }
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(Array.isArray(callBody)).toBe(true)
      expect(callBody).toHaveLength(10)
    })

    it('does not flush concurrently when a flush is in flight', () => {
      fetchMock.mockImplementation(() => new Promise(() => {})) // never resolves
      client.start()
      for (let i = 0; i < 20; i++) {
        client.recordIntercept({
          endpointId: `ep${i}`, method: 'GET', path: '/api/test', status: 200, durationMs: i,
        })
      }
      // Only one flush should have been triggered (first batch of 10)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('re-queues batch on failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('fail'))
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }))

      client.start()
      for (let i = 0; i < 10; i++) {
        client.recordIntercept({
          endpointId: `ep${i}`, method: 'GET', path: '/api/test', status: 200, durationMs: i,
        })
      }
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // After the failed fetch, items should be re-queued
      // Wait for the next timer tick
      await vi.advanceTimersByTimeAsync(5000)
      // The timer flush should try again
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })
})
