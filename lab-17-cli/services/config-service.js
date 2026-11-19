'use strict';

const fs = require('fs');
const path = require('path');
const { CliError } = require('../utils/errors');

/**
 * Reads config.json of the target project. The error is intentionally
 * user-facing: a missing file is a normal situation for a CLI, not a crash.
 */
function readConfig(configPath = 'config.json', baseDir = '.') {
  const target = path.resolve(baseDir, configPath);

  if (!fs.existsSync(target)) {
    throw new CliError(`файл конфигурации не найден: ${configPath}`, {
      hint: 'Укажите путь через --config',
      details: `${configPath} отсутствует в корне проекта`,
    });
  }

  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    throw new CliError(`не удалось прочитать ${configPath}: ${error.message}`, {
      hint: 'Проверьте, что файл содержит корректный JSON',
    });
  }
}

/** Reads package.json of the target project. */
function readProjectPackage(baseDir = '.') {
  const target = path.resolve(baseDir, 'package.json');

  if (!fs.existsSync(target)) {
    throw new CliError('файл package.json не найден', {
      hint: 'Запустите команду в каталоге проекта или укажите --dir',
    });
  }

  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    throw new CliError(`не удалось прочитать package.json: ${error.message}`);
  }
}

module.exports = { readConfig, readProjectPackage };
