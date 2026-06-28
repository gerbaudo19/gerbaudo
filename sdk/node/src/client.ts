import type { EndpointRegistration, InterceptPayload } from './types.js'

const DEFAULT_DAEMON_URL = 'http://127.0.0.1:9876'

export class GerbaudoClient {
  private daemonUrl: string
  private batchQueue: InterceptPayload[] = []
  private batchInterval: number
  private batchSize: number
  private timer: ReturnType<typeof setInterval> | null = null
  private registered: Set<string> = new Set()
  private flushing = false
  private endpointIdByKey: Map<string, string> = new Map()

  constructor(opts?: { daemonUrl?: string; batchInterval?: number; batchSize?: number }) {
    this.daemonUrl = opts?.daemonUrl ?? DEFAULT_DAEMON_URL
    this.batchInterval = opts?.batchInterval ?? 2000
    this.batchSize = opts?.batchSize ?? 50
  }

  start(): void {
    this.timer = setInterval(() => this.flush(), this.batchInterval)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.flush()
  }

  async registerEndpoint(endpoint: EndpointRegistration): Promise<void> {
    const key = `${endpoint.method}:${endpoint.path}`
    if (this.registered.has(key)) return

    try {
      const res = await fetch(`${this.daemonUrl}/api/catalog/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint),
      })
      if (res.ok) {
        const data = (await res.json()) as { id: string }
        this.endpointIdByKey.set(key, data.id)
      }
    } catch {
      // daemon might not be running yet
    }
    this.registered.add(key)
  }

  getEndpointId(method: string, path: string): string {
    const key = `${method}:${path}`
    return this.endpointIdByKey.get(key) ?? key
  }

  recordIntercept(payload: InterceptPayload): void {
    this.batchQueue.push(payload)
    if (this.batchQueue.length >= this.batchSize) {
      this.flush()
    }
  }

  private flush(): void {
    if (this.flushing || this.batchQueue.length === 0) return
    this.flushing = true

    const batch = this.batchQueue.splice(0, this.batchSize)
    fetch(`${this.daemonUrl}/api/intercept/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.length === 1 ? batch[0] : batch),
    })
      .catch(() => {
        // re-queue on failure
        this.batchQueue.unshift(...batch)
      })
      .finally(() => {
        this.flushing = false
      })
  }
}
