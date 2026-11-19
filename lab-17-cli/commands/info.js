'use strict';

const config = require('../config');
const logger = require('../utils/logger');
const { localDate } = require('../utils/format');

module.exports = (program) => {
  program
    .command('info')
    .description('вывести информацию о группе')
    .action(() => {
      logger.data(`Группа: ${config.group}`);
      logger.data(`Студент: ${config.student.fullName}`);
      logger.data(`Лабораторная работа: №${config.lab}`);
      logger.data(`Вариант: ${config.variant}`);
      logger.data(`Дата: ${localDate()}`);
    });
};
