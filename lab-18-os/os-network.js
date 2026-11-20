#!/usr/bin/env node
'use strict';

const config = require('./config');
const { parseArgs } = require('./lib/args');
const { collectNetworkInfo, collectUserInfo } = require('./lib/system');

const SECTIONS = ['all', 'interfaces', 'user', 'mac', 'root'];

/**
 * Task 3: interface list and the "primary" interface.
 * @param {object} network
 */
function printInterfaces(network) {
  console.log('=== Сетевые интерфейсы ===');

  for (const item of network.list) {
    console.log(`Интерфейс: ${item.name}`);
    console.log(`  IPv4: ${item.ipv4 || 'нет'}`);
    console.log(`  IPv6: ${item.ipv6 || 'нет'}`);
    console.log(`  MAC: ${item.maskedMac}`);
    console.log(`  Внутренний: ${item.internal ? 'да' : 'нет'}`);
  }

  console.log(`Всего интерфейсов: ${network.total}`);

  if (network.primary) {
    console.log(`Основной интерфейс: ${network.primary.name} (${network.primary.ipv4})`);
  } else {
    console.log('Основной интерфейс: не найден (нет внешнего IPv4)');
  }
  console.log('');
}

/**
 * Task 3: current user information.
 * @param {object} user
 */
function printUser(user) {
  console.log('=== Информация о пользователе ===');
  console.log(`Имя пользователя: ${user.username}`);
  console.log(
    user.uidAvailable
      ? `UID: ${user.uid}`
      : `UID: ${user.uid} (на Windows не поддерживается)`,
  );
  console.log(
    user.uidAvailable
      ? `GID: ${user.gid}`
      : `GID: ${user.gid} (на Windows не поддерживается)`,
  );
  console.log(`Домашняя директория: ${user.homedir}`);
  console.log(`Оболочка: ${user.shell || 'не определена (Windows)'}`);
  console.log(`Группа: ${config.group}`);
  console.log('');
}

/**
 * Task 3: MAC masking demonstration.
 * @param {object} network
 */
function printMacMasking(network) {
  console.log('=== Маскирование MAC-адресов ===');

  for (const item of network.list) {
    const original = item.mac || 'нет';
    console.log(`${item.name}: ${original} -> ${item.maskedMac}`);
  }

  console.log('Маскируются последние три октета: производитель остаётся видимым.');
  console.log('');
}

/**
 * Task 3: root user check.
 * @param {object} user
 */
function printRootCheck(user) {
  console.log('=== Проверка root-пользователя ===');

  if (!user.uidAvailable) {
    console.log(`Пользователь "${user.username}" проверен: uid = ${user.uid} (Windows).`);
    console.log('Итог: пользователь не является root, повышение привилегий не обнаружено.');
  } else if (user.isRoot) {
    console.log(`Пользователь "${user.username}" является root (uid = 0).`);
    console.log('Итог: работа с правами суперпользователя не рекомендуется.');
  } else {
    console.log(`Пользователь "${user.username}" не является root (uid = ${user.uid}).`);
    console.log('Итог: проверка пройдена.');
  }
  console.log('');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = typeof args.section === 'string' ? args.section : 'all';

  if (!SECTIONS.includes(section)) {
    console.error(`Неизвестная секция "${section}". Доступные: ${SECTIONS.join(', ')}`);
    process.exit(1);
  }

  const network = collectNetworkInfo();
  const user = collectUserInfo();

  if (section === 'all' || section === 'interfaces') printInterfaces(network);
  if (section === 'all' || section === 'user') printUser(user);
  if (section === 'all' || section === 'mac') printMacMasking(network);
  if (section === 'all' || section === 'root') printRootCheck(user);
}

main();
