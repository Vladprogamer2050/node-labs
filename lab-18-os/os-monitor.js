#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const config = require('./config');
const { parseArgs } = require('./lib/args');
const { formatGb, formatPercent, formatLogLine } = require('./lib/format');
const {
  collectSnapshot,
  collectMemoryInfo,
  cpuTimesSnapshot,
  cpuLoadBetween,
} = require('./lib/system');

const DEFAULTS = {
  interval: 2000,
  ticks: 0,
};

/**
 * Reads numeric flag values with validation.
 * @param {*} value raw CLI value
 * @param {number} fallback
 * @param {{ min: number, max: number, name: string }} limits
 * @returns {number}
 */
function readNumber(value, fallback, limits) {
  if (value === undefined) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < limits.min || parsed > limits.max) {
    console.error(
      `Флаг ${limits.name} принимает число от ${limits.min} до ${limits.max}, получено: ${value}`,
    );
    process.exit(1);
  }

  return parsed;
}

/**
 * Task 4: initial snapshot printed before monitoring starts.
 * @param {object} snapshot
 * @param {object} settings
 * @param {string} logPath
 */
function printSnapshot(snapshot, settings, logPath) {
  console.log(`=== Первичный сбор данных (группа ${config.group}) ===`);
  console.log(`Метка времени: ${snapshot.timestamp}`);
  console.log(
    `Хост: ${snapshot.base.hostname}, ${snapshot.base.type} ${snapshot.base.release}, ${snapshot.base.arch}`,
  );
  console.log(
    `Процессор: ${snapshot.cpu.model}, ${snapshot.cpu.cores} логических ядер, ` +
      `средняя частота ${snapshot.cpu.averageSpeed} МГц`,
  );
  console.log(
    `Память: ${formatGb(snapshot.memory.total)} ГБ всего, ` +
      `${formatGb(snapshot.memory.free)} ГБ свободно (${formatPercent(snapshot.memory.freePercent)})`,
  );

  const primary = snapshot.network.primary;
  console.log(
    `Сеть: интерфейсов — ${snapshot.network.total}, основной — ` +
      (primary ? `${primary.name} (${primary.ipv4})` : 'не найден'),
  );
  console.log(
    `Пользователь: ${snapshot.user.username}, root: ${snapshot.user.isRoot ? 'да' : 'нет'}`,
  );
  console.log(
    `Пороги: CPU > ${formatPercent(settings.cpuWarning, 0)} — предупреждение, ` +
      `CPU > ${formatPercent(settings.cpuCritical, 0)} — критично, ` +
      `RAM < ${formatPercent(settings.freeMemoryCritical, 0)} свободно — предупреждение`,
  );
  console.log(`Лог: ${logPath}`);
  console.log('');
}

/**
 * Builds a human readable message for monitor.log.
 * @param {number} loadPercent
 * @param {object} memory
 * @param {object} settings
 * @returns {string}
 */
function describeAnomaly(loadPercent, memory, settings) {
  const parts = [];

  if (loadPercent > settings.cpuCritical) {
    parts.push(`критическая загрузка CPU: ${formatPercent(loadPercent)}`);
  } else if (loadPercent > settings.cpuWarning) {
    parts.push(`высокая загрузка CPU: ${formatPercent(loadPercent)}`);
  }

  if (memory.freePercent < settings.freeMemoryCritical) {
    parts.push(`мало свободной памяти: ${formatPercent(memory.freePercent)}`);
  }

  return parts.join('; ');
}

/**
 * Classifies the current state by CPU load and free memory.
 * @param {number} loadPercent
 * @param {object} memory
 * @param {object} settings
 * @returns {'normal'|'warning'|'critical'}
 */
function classify(loadPercent, memory, settings) {
  if (loadPercent > settings.cpuCritical) return 'critical';
  if (loadPercent > settings.cpuWarning || memory.freePercent < settings.freeMemoryCritical) {
    return 'warning';
  }
  return 'normal';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const interval = readNumber(args.interval, DEFAULTS.interval, {
    min: 250,
    max: 60000,
    name: '--interval',
  });
  const ticks = Math.trunc(
    readNumber(args.ticks, DEFAULTS.ticks, { min: 0, max: 100000, name: '--ticks' }),
  );
  const explain = Boolean(args.explain);
  const logPath = path.join(__dirname, config.logFile);

  const settings = {
    cpuWarning: readNumber(args['cpu-warning'], config.thresholds.cpuWarning, {
      min: 0,
      max: 100,
      name: '--cpu-warning',
    }),
    cpuCritical: readNumber(args['cpu-critical'], config.thresholds.cpuCritical, {
      min: 0,
      max: 100,
      name: '--cpu-critical',
    }),
    freeMemoryCritical: readNumber(args['mem-critical'], config.thresholds.freeMemoryCritical, {
      min: 0,
      max: 100,
      name: '--mem-critical',
    }),
    freeMemory: config.thresholds.freeMemory,
  };

  if (settings.cpuWarning > settings.cpuCritical) {
    console.error('Флаг --cpu-warning не может быть больше --cpu-critical.');
    process.exit(1);
  }

  // Task 4: the first data collection is a single snapshot object.
  if (args.once) {
    const snapshot = collectSnapshot({ settings, logFile: config.logFile, interval });
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
    return;
  }

  const snapshot = collectSnapshot({ settings, logFile: config.logFile, interval });
  printSnapshot(snapshot, settings, logPath);

  let previous = cpuTimesSnapshot();
  let warnings = 0;
  let tickNumber = 0;
  let lastState = 'normal';
  let firstStatus = true;
  let lastLength = 0;
  let timer = null;

  /**
   * Writes a warning line to monitor.log.
   * @param {string} line
   */
  function appendLog(line) {
    try {
      fs.appendFileSync(logPath, `${line}\n`, 'utf8');
    } catch (error) {
      process.stderr.write(`Не удалось записать ${config.logFile}: ${error.message}\n`);
    }
  }

  /**
   * Stops the monitor with the final summary.
   * @param {string} reason
   */
  function stop(reason) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (!explain) process.stdout.write('\n');
    console.log(`${reason} Предупреждений: ${warnings}`);
    process.exit(0);
  }

  // Task 4: graceful exit on Ctrl+C.
  process.on('SIGINT', () => {
    stop('Мониторинг остановлен.');
  });

  console.log(`Мониторинг (группа ${config.group}). Ctrl+C для выхода.`);
  if (!explain) process.stdout.write('\n');

  timer = setInterval(() => {
    const current = cpuTimesSnapshot();
    const load = cpuLoadBetween(previous, current);
    previous = current;

    const memory = collectMemoryInfo(settings);
    const state = classify(load.percent, memory, settings);
    const marker = state === 'critical' ? ' [!!]' : state === 'warning' ? ' [!]' : '';
    const summary =
      `CPU: ${formatPercent(load.percent)} | ` +
      `RAM: ${formatPercent(memory.usedPercent)} (${formatGb(memory.free)} ГБ свободно)`;

    let loggedLine = null;
    if (state !== 'normal' && state !== lastState) {
      const line = formatLogLine(
        new Date(),
        config.group,
        describeAnomaly(load.percent, memory, settings),
      );
      appendLog(line);
      warnings += 1;
      loggedLine = line;
    }
    lastState = state;

    tickNumber += 1;

    if (explain) {
      // Explain mode prints the math of the CPU load calculation as plain lines.
      console.log(
        `[${tickNumber}] ${summary}${marker} | busy ${load.busyDiff} / total ${load.totalDiff} мс ` +
          `(${load.cores} ядер, интервал ${interval} мс)`,
      );
      if (loggedLine) console.log(`    monitor.log: ${loggedLine}`);
    } else {
      const line = `${summary}${marker}`;
      const padding = lastLength > line.length ? ' '.repeat(lastLength - line.length) : '';
      process.stdout.write(firstStatus ? line : `\r${line}${padding}`);
      firstStatus = false;
      lastLength = line.length;
    }

    if (ticks > 0 && tickNumber >= ticks) {
      stop('Мониторинг остановлен.');
    }
  }, interval);
}

main();
