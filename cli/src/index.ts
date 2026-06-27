#!/usr/bin/env node

import { Command } from 'commander'
import { createDaemonCommand } from './commands/daemon.js'
import { createInstallCommand } from './commands/install.js'
import { createEndpointsCommand } from './commands/endpoints.js'
import { createLogCommand } from './commands/log.js'
import { createStatsCommand } from './commands/stats.js'
import { createRunCommand } from './commands/run.js'

const program = new Command()

program
  .name('gerbaudo')
  .description('Local CLI tool for backend API instrumentation')
  .version('0.1.0')

program.addCommand(createDaemonCommand())
program.addCommand(createInstallCommand())
program.addCommand(createEndpointsCommand())
program.addCommand(createLogCommand())
program.addCommand(createStatsCommand())
program.addCommand(createRunCommand())

program.parse(process.argv)
