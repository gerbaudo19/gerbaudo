import { unlinkSync } from 'node:fs'
import { spawn, ChildProcess } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLI_ENTRY = join(__dirname, 'cli', 'src', 'index.ts')
const DAEMON_PORT = 9878
const BASE = `http://127.0.0.1:${DAEMON_PORT}`

let daemon: ChildProcess
let endpointId = ''

async function waitForDaemon(maxMs = 10000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${BASE}/api/catalog`)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('Daemon did not start')
}

async function test(desc: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  PASS: ${desc}`)
  } catch (e) {
    console.log(`  FAIL: ${desc} — ${e}`)
    process.exit(1)
  }
}

async function main() {
  // Clean up any leftover test DB from a previous run
  const testDb = join(__dirname, '.gerbaudo-test.db')
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      unlinkSync(testDb + suffix)
    } catch {}
  }

  console.log('Starting daemon...')
  daemon = spawn('cmd.exe', ['/c', 'npx', 'tsx', CLI_ENTRY, 'daemon', '--port', String(DAEMON_PORT), '--db', testDb], {
    stdio: 'pipe',
  })

  daemon.stdout?.on('data', (d: Buffer) => process.stdout.write(`  [daemon] ${d}`))
  daemon.stderr?.on('data', (d: Buffer) => process.stderr.write(`  [daemon] ${d}`))

  await waitForDaemon()
  console.log('Daemon ready.\n')

  await test('GET /api/catalog returns empty array', async () => {
    const r = await fetch(`${BASE}/api/catalog`)
    const data = await r.json()
    if (!Array.isArray(data) || data.length !== 0) throw new Error('Expected empty array')
  })

  await test('POST /api/catalog/register creates endpoint', async () => {
    const r = await fetch(`${BASE}/api/catalog/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path: '/api/users' }),
    })
    const data = await r.json()
    endpointId = data.id
    if (data.method !== 'GET' || data.path !== '/api/users') throw new Error('Wrong endpoint data')
  })

  await test('GET /api/catalog returns registered endpoint', async () => {
    const r = await fetch(`${BASE}/api/catalog`)
    const data = await r.json()
    if (data.length !== 1 || data[0].path !== '/api/users') throw new Error('Expected 1 endpoint')
  })

  await test('POST /api/catalog/register updates existing endpoint', async () => {
    const r = await fetch(`${BASE}/api/catalog/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path: '/api/users', params: '["id"]' }),
    })
    const data = await r.json()
    if (data.params !== '["id"]') throw new Error('Params not updated')
  })

  await test('POST /api/intercept/record creates record', async () => {
    const r = await fetch(`${BASE}/api/intercept/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpointId,
        method: 'GET',
        path: '/api/users',
        status: 200,
        durationMs: 42,
      }),
    })
    const data = await r.json()
    if (data.status !== 200 || data.durationMs !== 42) throw new Error('Wrong record data')
  })

  await test('GET /api/records returns records', async () => {
    const r = await fetch(`${BASE}/api/records`)
    const data = await r.json()
    if (!Array.isArray(data) || data.length < 1) throw new Error('Expected records')
  })

  await test('GET /api/stats returns stats object', async () => {
    const r = await fetch(`${BASE}/api/stats`)
    const data = await r.json()
    if (typeof data.totalEndpoints !== 'number') throw new Error('Stats missing totalEndpoints')
  })

  await test('GET /api/agent/endpoints returns agent format', async () => {
    const r = await fetch(`${BASE}/api/agent/endpoints`)
    const data = await r.json()
    if (!data.version || !Array.isArray(data.endpoints)) throw new Error('Wrong agent format')
  })

  await test('POST /api/agent/exec returns forward instruction', async () => {
    const catalog = await (await fetch(`${BASE}/api/catalog`)).json()
    const r = await fetch(`${BASE}/api/agent/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpointId: catalog[0].id }),
    })
    const data = await r.json()
    if (data.instruction !== 'forward') throw new Error('Expected forward instruction')
  })

  console.log('\nAll tests passed!')
}

main().finally(() => {
  if (daemon) daemon.kill()
})
