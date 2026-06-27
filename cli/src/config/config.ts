import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

export interface GerbaudoConfig {
  daemonPort: number
  dbPath: string
  sdkPath?: string
}

const DEFAULT_CONFIG: GerbaudoConfig = {
  daemonPort: 9876,
  dbPath: '.gerbaudo/data.db',
}

export function findConfigPath(startDir?: string): string | null {
  let dir = startDir ?? process.cwd()
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'gerbaudo.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

export function loadConfig(path?: string): GerbaudoConfig {
  const configPath = path ?? findConfigPath()
  if (!configPath) {
    return { ...DEFAULT_CONFIG }
  }
  const raw = readFileSync(configPath, 'utf-8')
  return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
}

export function writeConfig(
  config: GerbaudoConfig,
  targetPath: string,
): void {
  writeFileSync(targetPath, JSON.stringify(config, null, 2))
}
