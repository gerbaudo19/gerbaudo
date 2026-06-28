#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { createDaemonCommand } from './commands/daemon.js'
import { createInstallCommand } from './commands/install.js'
import { createEndpointsCommand } from './commands/endpoints.js'
import { createLogCommand } from './commands/log.js'
import { createStatsCommand } from './commands/stats.js'
import { createRunCommand } from './commands/run.js'
import { createExportCommand } from './commands/export.js'

const WIDTH = 44

function topLine(): string {
  return chalk.cyan('╭' + '─'.repeat(WIDTH) + '╮')
}

function bottomLine(): string {
  return chalk.cyan('╰' + '─'.repeat(WIDTH) + '╯')
}

function emptyLine(): string {
  return chalk.cyan('│') + ' '.repeat(WIDTH) + chalk.cyan('│')
}

function centerText(text: string, color: (s: string) => string = chalk.reset): string {
  const pad = Math.max(0, WIDTH - text.length)
  const left = Math.floor(pad / 2)
  const right = pad - left
  return chalk.cyan('│') + ' '.repeat(left) + color(text) + ' '.repeat(right) + chalk.cyan('│')
}

const banner = `${topLine()}
${emptyLine()}
${centerText('Gerbaudo v0.1.1', (s) => chalk.bold.hex('#F0C040')(s))}
${centerText('CLI-first API instrumentation', chalk.dim)}
${emptyLine()}
${bottomLine()}
`

const program = new Command()

program    .name('gerbaudo').description('CLI-first API instrumentation for Express backends').version('0.1.1')

program.addHelpText('beforeAll', banner)

program.addCommand(createDaemonCommand())
program.addCommand(createInstallCommand())
program.addCommand(createEndpointsCommand())
program.addCommand(createLogCommand())
program.addCommand(createStatsCommand())
program.addCommand(createRunCommand())
program.addCommand(createExportCommand())

program.addHelpText(
  'afterAll',
  `
${chalk.bold('Examples:')}
  ${chalk.cyan('$ gerbaudo init')}
    Install Gerbaudo in the current project

  ${chalk.cyan('$ gerbaudo daemon')}
    Start the daemon server

  ${chalk.cyan('$ gerbaudo run GET /api/users')}
    Execute a GET endpoint

  ${chalk.cyan('$ gerbaudo run POST /api/users --data \'{"name":"John"}\'')}
    Execute a POST endpoint with JSON body

  ${chalk.cyan('$ gerbaudo log -m POST --since 2026-01-01')}
    Query request history with filters

  ${chalk.cyan('$ gerbaudo endpoints --json')}
    List all endpoints as JSON
`,
)

program.parse(process.argv)
