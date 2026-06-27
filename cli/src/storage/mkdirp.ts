import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export function mkdirp(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}
