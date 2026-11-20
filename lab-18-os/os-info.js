#!/usr/bin/env node
'use strict';

const config = require('./config');
const { collectBaseInfo } = require('./lib/system');

/**
 * Task 1 (basic level): platform and architecture information.
 */
function main() {
  const info = collectBaseInfo();

  console.log(`=== Информация о системе (группа ${config.group}) ===`);
  console.log(`Платформа: ${info.platform}`);
  console.log(`Тип ОС: ${info.type}`);
  console.log(`Архитектура: ${info.arch}`);
  console.log(`Версия ОС: ${info.release}`);
  console.log(`Имя хоста: ${info.hostname}`);
  console.log(`Время работы: ${info.uptime} (${info.uptimeSeconds} сек)`);
  console.log('');
  console.log(info.message);
}

main();
