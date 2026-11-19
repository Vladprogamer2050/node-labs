'use strict';

const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');
const { readPipedInput } = require('../utils/stdin');
const { typeLabel, optionLabels } = require('../utils/format');
const { initProject } = require('../services/project-service');

const OPTION_FLAGS = [
  ['typescript', '--typescript'],
  ['eslint', '--eslint'],
  ['prettier', '--prettier'],
  ['jest', '--jest'],
];

function collectOptions(options) {
  return OPTION_FLAGS.filter(([key]) => Boolean(options[key])).map(([key]) => key);
}

function validateType(type) {
  const allowed = config.projectTypes.map((item) => item.value);
  if (!allowed.includes(type)) {
    throw new CliError(`недопустимый тип проекта "${type}". Допустимые значения: ${allowed.join(', ')}`);
  }
  return type;
}

function validateName(name) {
  const value = String(name || '').trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    throw new CliError(`недопустимое название проекта "${value}"`, {
      hint: 'Разрешены латинские буквы, цифры, дефис, точка и подчёркивание',
    });
  }
  return value;
}

/**
 * Interactive dialog (inquirer): input, list, checkbox, confirm, password.
 * Every question is asked only when the value was not passed as a flag.
 */
async function askInteractive(data) {
  const inquirer = require('inquirer');
  const answers = {};

  if (!data.name) {
    const result = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Введите название проекта:',
        default: 'my-project',
        validate: (value) =>
          /^[a-z0-9][a-z0-9._-]*$/i.test(value.trim()) || 'Недопустимое название проекта',
      },
    ]);
    answers.name = result.name;
  }

  if (!data.type) {
    const result = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Выберите тип проекта:',
        choices: config.projectTypes,
      },
    ]);
    answers.type = result.type;
  }

  if (data.options.length === 0) {
    const result = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'options',
        message: 'Выберите дополнительные опции:',
        choices: config.projectOptions,
      },
    ]);
    answers.options = result.options;
  }

  if (data.git === undefined) {
    const result = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'git',
        message: 'Использовать Git?',
        default: true,
      },
    ]);
    answers.git = result.git;
  }

  if (!data.token) {
    const result = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Введите токен доступа:',
        mask: '*',
      },
    ]);
    answers.token = result.token;
  }

  return answers;
}

module.exports = (program) => {
  program
    .command('init')
    .description('инициализировать проект')
    .option('-n, --name <name>', 'название проекта')
    .option('-t, --type <type>', `тип проекта: ${config.projectTypes.map((item) => item.value).join(', ')}`)
    .option('--typescript', 'добавить TypeScript')
    .option('--eslint', 'добавить ESLint')
    .option('--prettier', 'добавить Prettier')
    .option('--jest', 'добавить Jest')
    .option('--git', 'инициализировать Git-репозиторий')
    .option('--no-git', 'не инициализировать Git-репозиторий')
    .option('--token <token>', 'токен доступа (необязательно)')
    .option('--dir <path>', 'каталог, в котором создаётся проект', '.')
    .option('--no-interactive', 'не задавать вопросы (для CI/CD)')
    .action(async (options) => {
      const piped = process.stdin.isTTY ? null : await readPipedInput();
      const pipedName = piped ? piped.split(/\r?\n/)[0].trim() : '';

      const data = {
        name: options.name || pipedName || '',
        type: options.type || '',
        options: collectOptions(options),
        git: options.git,
        token: options.token || '',
      };

      const interactive = options.interactive !== false && Boolean(process.stdin.isTTY);

      if (interactive) {
        const answers = await askInteractive(data);
        data.name = data.name || answers.name;
        data.type = data.type || answers.type;
        if (data.options.length === 0 && answers.options) data.options = answers.options;
        if (data.git === undefined && answers.git !== undefined) data.git = answers.git;
        if (!data.token && answers.token) data.token = answers.token;
      } else {
        if (!data.name) {
          throw new CliError('в неинтерактивном режиме необходимо указать --name и --type');
        }
        if (!data.type) {
          throw new CliError('недостаточно данных. Укажите --type');
        }
        if (data.git === undefined) data.git = false;
      }

      const name = validateName(data.name);
      const type = validateType(data.type);

      const result = initProject({
        name,
        type,
        options: data.options,
        git: data.git === true,
        token: data.token || null,
        baseDir: options.dir,
      });

      const relativeDir = path.relative(process.cwd(), result.dir).replace(/\\/g, '/') || '.';

      logger.success(`Проект "${result.name}" успешно инициализирован!`);
      logger.hint(`Тип: ${typeLabel(type, config.projectTypes)}`);
      logger.hint(`Опции: ${optionLabels(data.options, config.projectOptions)}`);
      logger.hint(`Git: ${result.git ? 'да' : 'нет'}`);
      logger.hint(`Каталог: ${relativeDir}`);
    });
};
