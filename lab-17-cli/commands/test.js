'use strict';

const logger = require('../utils/logger');
const { createSpinner } = require('../utils/spinner');
const { runProjectTests } = require('../services/project-service');

module.exports = (program) => {
  program
    .command('test')
    .description('запустить тесты проекта')
    .option('--dir <path>', 'каталог проекта', '.')
    .option('--verbose', 'показать полный вывод тестов')
    .action(async (options) => {
      // --verbose is also a global option, so commander may store it on the
      // root program instead of the subcommand.
      const verbose = Boolean(options.verbose || program.opts().verbose);
      const spinner = createSpinner('Запуск тестов...');
      spinner.start();

      const result = runProjectTests({ baseDir: options.dir });

      if (verbose) {
        spinner.stop();
        logger.data(result.output.trim());
      }

      if (result.code === 0) {
        const message = `Пройдено: ${result.passed}/${result.total} тестов`;
        if (verbose) logger.success(message);
        else spinner.succeed(message);
        return;
      }

      if (result.parsed) {
        const message = `Провалено тестов: ${result.failed} из ${result.total}`;
        if (verbose) logger.error(message);
        else spinner.fail(message);
      } else {
        const message = `Тесты завершились с кодом ${result.code}`;
        if (verbose) logger.error(message);
        else spinner.fail(message);
      }
      process.exitCode = 1;
    });
};
