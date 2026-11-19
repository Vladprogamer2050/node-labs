'use strict';

const logger = require('../utils/logger');
const { convertFile, CONVERT_TYPES } = require('../services/report-service');

module.exports = (program) => {
  program
    .command('convert <input>')
    .description('конвертировать файл')
    .option('--to <format>', `целевой формат: ${CONVERT_TYPES.join(', ')}`, 'json')
    .option('-o, --output <path>', 'путь для сохранения')
    .option('-f, --force', 'перезаписать существующий файл')
    .option('--dry-run', 'показать что будет сделано без выполнения')
    .action((input, options) => {
      const target = options.output || `${input.replace(/\.[^.]+$/, '')}.${options.to}`;

      if (options.dryRun) {
        logger.info(`[DRY-RUN] Файл ${input} будет конвертирован в формат: ${options.to}`);
        logger.info(`[DRY-RUN] Результат будет сохранён в: ./${target}`);
        logger.warning('Действия не выполнены (режим проверки)');
        return;
      }

      const result = convertFile({
        input,
        to: options.to,
        output: options.output,
        force: Boolean(options.force),
      });

      logger.success(`Файл сконвертирован: ${result.path} (${result.bytes} B)`);
    });
};
