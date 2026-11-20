#!/usr/bin/env node
'use strict';

const config = require('./config');
const { parseArgs } = require('./lib/args');
const { formatGb, formatPercent } = require('./lib/format');
const { collectCpuInfo, collectMemoryInfo, collectLoadAverage } = require('./lib/system');

const SECTIONS = ['all', 'cpu', 'memory', 'load'];

/**
 * Parses --section and --free-limit flags.
 * @returns {{ section: string, thresholds: object }}
 */
function readOptions() {
  const args = parseArgs(process.argv.slice(2));
  const section = typeof args.section === 'string' ? args.section : 'all';

  if (!SECTIONS.includes(section)) {
    console.error(`Неизвестная секция "${section}". Доступные: ${SECTIONS.join(', ')}`);
    process.exit(1);
  }

  const thresholds = { ...config.thresholds };

  if (args['free-limit'] !== undefined) {
    const value = Number(args['free-limit']);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      console.error('Флаг --free-limit принимает число от 0 до 100 (проценты).');
      process.exit(1);
    }
    thresholds.freeMemory = value;
  }

  return { section, thresholds };
}

/**
 * Task 2: CPU information.
 */
function printCpu() {
  const cpu = collectCpuInfo();

  console.log('=== Информация о процессоре ===');
  console.log(`Количество логических ядер: ${cpu.cores}`);
  console.log(`Модель процессора: ${cpu.model}`);
  console.log(`Частота ядер (МГц): ${cpu.speeds.join(', ')}`);
  console.log(`Средняя частота: ${cpu.averageSpeed} МГц`);
  console.log('');
}

/**
 * Task 2: memory information with the adaptive warning.
 * @param {object} thresholds
 */
function printMemory(thresholds) {
  const memory = collectMemoryInfo(thresholds);

  console.log('=== Информация о памяти ===');
  console.log(`Общий объём: ${formatGb(memory.total)} ГБ`);
  console.log(`Свободно: ${formatGb(memory.free)} ГБ`);
  console.log(`Использовано: ${formatGb(memory.used)} ГБ (${formatPercent(memory.usedPercent)})`);
  console.log(`Свободно в процентах: ${formatPercent(memory.freePercent)}`);
  console.log(`Группа: ${config.group}`);

  if (memory.low) {
    console.log(
      `[!] Предупреждение: свободной памяти ${formatPercent(memory.freePercent)}, ` +
        `это меньше порога ${formatPercent(memory.freeLimit, 0)}`,
    );
  } else {
    console.log(`Память в норме (порог предупреждения: ${formatPercent(memory.freeLimit, 0)} свободно)`);
  }
  console.log('');
}

/**
 * Task 2: load average with the Windows note.
 */
function printLoadAverage() {
  const load = collectLoadAverage();

  console.log('=== Средняя загрузка системы ===');
  console.log(`За 1 минуту: ${load.values[0].toFixed(2)}`);
  console.log(`За 5 минут: ${load.values[1].toFixed(2)}`);
  console.log(`За 15 минут: ${load.values[2].toFixed(2)}`);

  if (!load.available) {
    console.log('Примечание: на Windows os.loadavg() всегда возвращает [0, 0, 0],');
    console.log('реальную загрузку CPU показывает os-monitor.js (расчёт по os.cpus()).');
  } else {
    console.log('Значения показывают среднее количество процессов в очереди на выполнение.');
  }
  console.log('');
}

function main() {
  const { section, thresholds } = readOptions();

  if (section === 'all' || section === 'cpu') printCpu();
  if (section === 'all' || section === 'memory') printMemory(thresholds);
  if (section === 'all' || section === 'load') printLoadAverage();
}

main();
