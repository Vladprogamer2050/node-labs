#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const pkg = require('../package.json');
const config = require('../config');
const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');
const { configureOutput } = require('../utils/help');

/**
 * Entry point. commander only maps flags to option objects; all work happens in
 * commands/ and services/. Unexpected exceptions and rejected promises are
 * handled here, so the user sees a readable message instead of a stack trace.
 */
process.on('uncaughtException', (error) => logger.fatal(error));
process.on('unhandledRejection', (reason) => logger.fatal(reason));

const program = new Command();

program
  .name('lab17-cli')
  .description(`CLI-приложение для лабораторной работы №${config.lab} (группа ${config.group})`)
  .version(pkg.version, '-V, --version', 'вывести версию')
  .option('-v, --verbose', 'подробный вывод')
  .showHelpAfterError('Для справки используйте: lab17-cli --help')
  .action(() => {
    // A positional operand that does not match any subcommand is an unknown
    // command, not a reason to print the whole help with code 0.
    if (program.args.length > 0) {
      logger.fatal(
        new CliError(`неизвестная команда "${program.args[0]}"`, {
          hint: 'Для справки используйте: lab17-cli --help',
        })
      );
      return;
    }
    program.help();
  });

configureOutput(program);

require('../commands/greet')(program);
require('../commands/info')(program);
require('../commands/generate')(program);
require('../commands/convert')(program);
require('../commands/init')(program);
require('../commands/build')(program);
require('../commands/test')(program);
require('../commands/deploy')(program);
require('../commands/process')(program);
require('../commands/demo')(program);

program.parseAsync(process.argv).catch((error) => {
  logger.fatal(error);
});
