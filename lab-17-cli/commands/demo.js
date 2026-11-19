'use strict';

const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');
const { createSpinner } = require('../utils/spinner');
const { createProgressBar } = require('../utils/progress');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Demonstration command for task 4: colors, spinner, progress bar, stream
 * separation and the uncaught error handler. It performs no real work.
 */
module.exports = (program) => {
  program
    .command('demo')
    .description('продемонстрировать цвета, спиннер и прогресс-бар')
    .option('--mode <mode>', 'colors | spinner | progress | streams | crash | fail | silent', 'colors')
    .action(async (options) => {
      switch (options.mode) {
        case 'colors': {
          logger.info('Информационное сообщение');
          logger.success('Операция выполнена успешно');
          logger.warning('Предупреждение: данные могут быть неполными');
          logger.error('Ошибка: файл не найден');
          logger.verbose(true, 'Подробный вывод включается флагом --verbose');
          break;
        }

        case 'spinner': {
          const spinner = createSpinner('Обработка данных...');          spinner.start();
          await sleep(2600);
          spinner.text = 'Почти готово...';
          await sleep(2000);
          spinner.succeed('Обработка завершена');
          break;
        }

        case 'progress': {
          const total = 12;
          const bar = createProgressBar(total);
          for (let index = 1; index <= total; index += 1) {
            await sleep(250);
            bar.update(index);
          }
          bar.stop();
          logger.success(`Обработано файлов: ${total}`);
          break;
        }

        case 'streams': {
          logger.data('{"result":"данные уходят в stdout"}');
          logger.info('Информационный лог уходит в stderr');
          logger.success('Операция завершена');
          break;
        }

        case 'crash': {
          logger.info('Ожидание неотловленной ошибки...');
          setTimeout(() => {
            throw new CliError('демонстрационная неотловленная ошибка', {
              hint: 'Так CLI сообщает об ошибке без стектрейса',
            });
          }, 100);
          await sleep(300);
          break;
        }

        case 'silent': {
          // Nothing is printed: the exit code is the only result.
          break;
        }

        case 'fail': {
          // Unexpected error (not a CliError): development shows the stack,
          // production prints the short message only.
          throw new Error('внутренняя ошибка: не удалось прочитать config.json');
        }

        default:
          throw new CliError(`неизвестный режим демонстрации: ${options.mode}`);
      }
    });
};
