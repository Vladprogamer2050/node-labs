'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const { CliError } = require('../utils/errors');

module.exports = (program) => {
  program
    .command('greet <name>')
    .description('поприветствовать пользователя')
    .action((name) => {
      const value = String(name || '').trim();
      if (!value) {
        throw new CliError('не передано имя пользователя', {
          hint: 'Например: lab17-cli greet Владислав',
        });
      }
      logger.data(`Привет, ${value}! Добро пожаловать в CLI-приложение группы ${config.group}.`);
    });
};
