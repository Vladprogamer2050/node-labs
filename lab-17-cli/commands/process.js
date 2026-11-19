'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');
const { createProgressBar } = require('../utils/progress');
const { expandFiles, processFiles } = require('../services/process-service');

module.exports = (program) => {
  program
    .command('process')
    .description('обработать файлы и вывести статистику в JSON')
    .option('-f, --files <files...>', 'файлы или маски, например *.txt')
    .option('-o, --output <path>', 'записать результат в файл вместо stdout')
    .option('--delay <ms>', 'задержка на файл для демонстрации прогресс-бара', '120')
    .option('-q, --quiet', 'не выводить ничего, кроме данных (Silence is Golden)')
    .action(async (options) => {
      if (!options.files || options.files.length === 0) {
        throw new CliError('не указаны файлы', { hint: 'Используйте --files <files...>' });
      }

      const quiet = Boolean(options.quiet);
      const showProgress = !quiet && Boolean(process.stderr.isTTY);
      const delayMs = showProgress ? Number(options.delay) || 0 : 0;

      const { files } = expandFiles(options.files);
      const bar = showProgress && files.length > 0 ? createProgressBar(files.length) : null;

      try {
        const result = await processFiles({
          patterns: options.files,
          delayMs,
          onProgress: (done) => {
            if (bar) bar.update(done);
          },
        });

        if (bar) bar.stop();

        for (const file of result.missing) {
          logger.error(`Файл ${file} не найден`);
        }

        const payload = {
          generatedAt: new Date().toISOString(),
          total: result.total,
          processed: result.processed,
          skipped: result.skipped,
          files: result.files,
          missing: result.missing,
        };
        const json = `${JSON.stringify(payload, null, 2)}\n`;

        if (options.output) {
          const absolute = path.resolve(options.output);
          fs.mkdirSync(path.dirname(absolute), { recursive: true });
          fs.writeFileSync(absolute, json, 'utf8');
          if (!quiet) logger.success(`Результат сохранён: ${options.output}`);
        } else {
          logger.data(json.trimEnd());
        }

        if (result.skipped > 0) {
          if (!quiet) logger.warning(`Пропущено ${result.skipped} файл(ов)`);
          process.exitCode = 1;
        }
      } catch (error) {
        if (bar) bar.stop();
        throw error;
      }
    });
};
