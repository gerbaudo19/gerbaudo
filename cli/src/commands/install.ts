import { Command } from 'commander'
import { existsSync, mkdirSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { writeConfig } from '../config/config.js'

function detectExpress(dir: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    return 'express' in deps
  } catch {
    return false
  }
}

function getSdkPath(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  // Walk up looking for sdk/node/package.json marker
  let dir = __dirname
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'sdk', 'node', 'package.json'))) {
      return join(dir, 'sdk', 'node')
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  // Fallback: assume repo-local dev layout (tsx from cli/)
  return join(__dirname, '..', '..', '..', '..', 'sdk', 'node')
}

export function createInstallCommand(): Command {
  const cmd = new Command('install')
    .alias('init')
    .description('Install Gerbaudo into the current project')
    .option('--port <number>', 'Daemon port', '9876')
    .option('--sdk', 'Auto-install the Node SDK package')
    .action((opts) => {
      const targetDir = process.cwd()
      const configPath = join(targetDir, 'gerbaudo.json')

      if (existsSync(configPath)) {
        console.log('gerbaudo.json already exists. Skipping config creation.')
        return
      }

      const config = {
        daemonPort: parseInt(opts.port, 10),
        dbPath: '.gerbaudo/data.db',
      }

      writeConfig(config, configPath)
      const dbDir = join(targetDir, '.gerbaudo')
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true })
      }

      console.log('Gerbaudo installed successfully.')
      console.log()
      console.log('Configuration written to: gerbaudo.json')

      const isExpress = detectExpress(targetDir)

      if (opts.sdk && isExpress) {
        const sdkPath = getSdkPath()
        console.log('Installing @gerbaudo/sdk-node...')
        try {
          execSync(`npm install "${sdkPath}"`, { cwd: targetDir, stdio: 'inherit' })
          console.log('SDK installed successfully.')
          console.log()
          console.log('Add to your Express app:')
          console.log('  import { gerbaudo } from "@gerbaudo/sdk-node"')
          console.log('  app.use(gerbaudo({ app }))')
        } catch {
          console.error('Failed to install SDK. Install manually:')
          console.log(`  npm install "${sdkPath}"`)
        }
      } else if (opts.sdk && !isExpress) {
        console.log('No Express project detected. Installing SDK anyway...')
        const sdkPath = getSdkPath()
        try {
          execSync(`npm install "${sdkPath}"`, { cwd: targetDir, stdio: 'inherit' })
          console.log('SDK installed successfully.')
        } catch {
          console.error('Failed to install SDK.')
        }
      } else {
        console.log()
        console.log('Next steps:')
        console.log('  1. Start the daemon:')
        console.log('     npx gerbaudo daemon')
        console.log()
        if (isExpress) {
          console.log('  2. Install the SDK:')
          console.log('     npx gerbaudo init --sdk')
          console.log()
          console.log('  3. Add to your Express app:')
          console.log('     import { gerbaudo } from "@gerbaudo/sdk-node"')
          console.log('     app.use(gerbaudo({ app }))')
        } else {
          console.log('  2. Install the Node SDK:')
          console.log('     npm install <path-to>/gerbaudo/sdk/node')
          console.log()
          console.log('  3. Add to your app:')
          console.log('     import { gerbaudo } from "@gerbaudo/sdk-node"')
          console.log('     app.use(gerbaudo({ app }))')
        }
      }
    })

  return cmd
}
