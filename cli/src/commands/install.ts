import { Command } from 'commander'
import chalk from 'chalk'
import { existsSync, mkdirSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { intro, outro, text, confirm, spinner, isCancel } from '@clack/prompts'
import { writeConfig, type GerbaudoConfig } from '../config/config.js'

const SDK_PACKAGE = '@gerbaudo/sdk-node'

function detectExpress(dir: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    return 'express' in deps
  } catch {
    return false
  }
}

export function createInstallCommand(): Command {
  const cmd = new Command('install')
    .alias('init')
    .description('Install Gerbaudo into the current project')
    .option('--port <number>', 'Daemon port')
    .option('--backend-url <url>', 'Backend server URL')
    .option('--sdk', 'Auto-install the Node SDK package')
    .action(async (opts) => {
      const targetDir = process.cwd()
      const configPath = join(targetDir, 'gerbaudo.json')

      if (existsSync(configPath)) {
        console.log(chalk.yellow('gerbaudo.json already exists. Skipping config creation.'))
        return
      }

      const hasFlags = opts.port !== undefined || opts.sdk !== undefined

      let daemonPort = parseInt(opts.port, 10) || 9876
      let dbPath = '.gerbaudo/data.db'
      let backendUrl = opts.backendUrl as string | undefined
      let installSdk = !!opts.sdk

      if (!hasFlags) {
        intro(chalk.inverse(' Gerbaudo Install '))

        const portResult = await text({
          message: 'Daemon port?',
          placeholder: '9876',
          defaultValue: '9876',
          validate: (v) => {
            if (v === undefined) return 'Enter a valid port (1-65535)'
            const n = parseInt(v, 10)
            if (isNaN(n) || n < 1 || n > 65535) return 'Enter a valid port (1-65535)'
          },
        })
        if (isCancel(portResult)) {
          outro('Cancelled.')
          return
        }
        daemonPort = parseInt(portResult as string, 10)

        const dbResult = await text({
          message: 'Database path?',
          placeholder: '.gerbaudo/data.db',
          defaultValue: '.gerbaudo/data.db',
        })
        if (isCancel(dbResult)) {
          outro('Cancelled.')
          return
        }
        dbPath = dbResult as string

        const urlResult = await text({
          message: 'Backend URL?',
          placeholder: 'http://127.0.0.1:3000',
          defaultValue: 'http://127.0.0.1:3000',
        })
        if (isCancel(urlResult)) {
          outro('Cancelled.')
          return
        }
        backendUrl = urlResult as string

        const sdkResult = await confirm({
          message: 'Install Node SDK?',
          initialValue: detectExpress(targetDir),
        })
        if (isCancel(sdkResult)) {
          outro('Cancelled.')
          return
        }
        installSdk = sdkResult as boolean
      }

      const config: GerbaudoConfig = { daemonPort, dbPath, backendUrl }
      writeConfig(config, configPath)
      const dbDir = join(targetDir, '.gerbaudo')
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true })
      }

      if (!hasFlags) {
        outro(chalk.green('Gerbaudo installed successfully.'))
      } else {
        console.log(chalk.green('Gerbaudo installed successfully.'))
      }
      console.log(chalk.cyan('Configuration written to:') + ' gerbaudo.json')

      if (installSdk) {
        const s = spinner()
        s.start('Installing @gerbaudo/sdk-node...')
        try {
          execSync(`npm install ${SDK_PACKAGE}`, { cwd: targetDir, stdio: installSdk ? 'pipe' : 'inherit' })
          s.stop('SDK installed successfully.')
          console.log()
          console.log('Add to your Express app:')
          console.log(`  import { gerbaudo } from "${SDK_PACKAGE}"`)
          console.log('  app.use(gerbaudo({ app }))')
        } catch {
          s.stop(chalk.red('Failed to install SDK.'))
          console.log(`Install manually: ${chalk.bold(`npm install ${SDK_PACKAGE}`)}`)
        }
      } else {
        console.log()
        console.log('Next steps:')
        console.log(`  ${chalk.cyan('1.')} Start the daemon: ${chalk.bold('npx @gerbaudo/cli daemon')}`)
        console.log()
        if (detectExpress(targetDir)) {
          console.log(`  ${chalk.cyan('2.')} Install the SDK: ${chalk.bold('npx @gerbaudo/cli init --sdk')}`)
          console.log()
          console.log(`  ${chalk.cyan('3.')} Add to your Express app:`)
          console.log(`     import { gerbaudo } from "${SDK_PACKAGE}"`)
          console.log('     app.use(gerbaudo({ app }))')
        } else {
          console.log(`  ${chalk.cyan('2.')} Install the Node SDK:`)
          console.log(`     ${chalk.bold(`npm install ${SDK_PACKAGE}`)}`)
          console.log()
          console.log(`  ${chalk.cyan('3.')} Add to your app:`)
          console.log(`     import { gerbaudo } from "${SDK_PACKAGE}"`)
          console.log('     app.use(gerbaudo({ app }))')
        }
      }
    })

  return cmd
}
