'use strict';

const readline = require('readline');
const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');
const { createSpinner } = require('../utils/spinner');
const { planDeploy } = require('../services/deploy-service');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Confirmation question; the prompt is written to stderr, not to stdout. */
function askYesNo(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

module.exports = (program) => {
  program
    .command('deploy')
    .description('развернуть проект')
    .option('--env <name>', 'окружение', 'staging')
    .option('-f, --force', 'развернуть без подтверждения')
    .option('--dir <path>', 'каталог проекта', '.')
    .action(async (options) => {
      if (!options.force) {
        if (!process.stdin.isTTY) {
          throw new CliError('требуется подтверждение развёртывания', {
            hint: 'Используйте --force для развёртывания без вопросов',
          });
        }

        logger.warning(`Вы собираетесь развернуть проект в ${options.env}!`);
        const confirmed = await askYesNo('Продолжить? (y/N) ');
        if (!confirmed) {
          logger.warning('Развёртывание отменено');
          return;
        }
      }

      const spinner = createSpinner('Развёртывание...');
      spinner.start();

      const plan = planDeploy({ baseDir: options.dir, env: options.env });
      await sleep(1200);

      spinner.succeed('Развёрнуто успешно');
      logger.data(`URL: ${plan.url}`);
      logger.warning('Демонстрационный режим: файлы не загружаются на реальный сервер');
    });
};
