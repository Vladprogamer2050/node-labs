'use strict';

const path = require('path');
const logger = require('../utils/logger');
const { assertReportType, generateReport, REPORT_TYPES } = require('../services/report-service');

module.exports = (program) => {
  program
    .command('generate')
    .description('сгенерировать отчёт')
    .option('-t, --type <type>', `тип отчёта: ${REPORT_TYPES.join(', ')}`, 'html')
    .option('-o, --output <path>', 'путь для сохранения')
    .option('-f, --force', 'перезаписать существующий файл')
    .option('--dry-run', 'показать что будет сделано без выполнения')
    .action((options) => {
      const verbose = Boolean(program.opts().verbose);
      const displayPath = path.normalize(options.output || `output.${options.type}`).replace(/\\/g, '/');

      assertReportType(options.type);

      if (options.dryRun) {
        logger.info(`[DRY-RUN] Будет сгенерирован отчёт типа: ${options.type}`);
        logger.info(`[DRY-RUN] Файл будет сохранён в: ./${displayPath}`);
        logger.warning('Действия не выполнены (режим проверки)');
        return;
      }

      logger.verbose(verbose, 'Запуск генерации отчёта...');
      logger.verbose(verbose, `Тип отчёта: ${options.type}`);
      logger.verbose(verbose, `Путь сохранения: ${displayPath}`);

      const result = generateReport({
        type: options.type,
        output: options.output,
        force: Boolean(options.force),
      });

      logger.success(`Отчёт успешно сгенерирован: ${result.path} (${result.humanSize})`);
    });
};
