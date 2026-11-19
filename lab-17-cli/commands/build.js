'use strict';

const logger = require('../utils/logger');
const { formatDuration, formatBytes } = require('../utils/format');
const { createSpinner } = require('../utils/spinner');
const { buildProject } = require('../services/project-service');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = (program) => {
  program
    .command('build')
    .description('собрать проект')
    .option('--config <path>', 'путь к файлу конфигурации', 'config.json')
    .option('--dir <path>', 'каталог проекта', '.')
    .option('--out <path>', 'каталог сборки', 'dist')
    .option('--dry-run', 'показать план без изменения файлов')
    .action(async (options) => {
      const spinner = createSpinner('Сборка проекта...');
      const startedAt = Date.now();
      spinner.start();

      try {
        if (options.dryRun) {
          const plan = buildProject({
            configPath: options.config,
            baseDir: options.dir,
            outDir: options.out,
            dryRun: true,
          });
          spinner.stop();
          logger.info('Режим проверки: файлы не изменены');
          logger.hint(`Точка входа: ${plan.entry}`);
          logger.hint(`Файлов в сборке: ${plan.sources.length} (${plan.sources.join(', ')})`);
          logger.hint(`Результат: ${plan.output}`);
          return;
        }

        const result = buildProject({
          configPath: options.config,
          baseDir: options.dir,
          outDir: options.out,
        });

        // The build of a small project is instant; a short pause keeps the
        // spinner visible in the demonstration recording.
        await sleep(400);

        spinner.succeed(`Сборка завершена за ${formatDuration(Date.now() - startedAt)}`);
        logger.data(`Результат: ${result.output} (${formatBytes(result.bytes)})`);
      } catch (error) {
        spinner.fail('Сборка не удалась');
        throw error;
      }
    });
};
