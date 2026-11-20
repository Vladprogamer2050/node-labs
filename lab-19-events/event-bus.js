#!/usr/bin/env node
'use strict';

const http = require('node:http');
const os = require('node:os');

const config = require('./config');
const { EventBus } = require('./lib/event-bus');
const { parseArgs } = require('./lib/args');
const { plural, formatUptime, formatGb, percentage, formatPercent } = require('./lib/format');

const SECTIONS = ['all', 'priority', 'wildcard', 'once', 'errors', 'metrics', 'server'];

/**
 * Task 5: priorities.
 */
function showPriority() {
  const bus = new EventBus({ group: config.group });

  console.log('--- Приоритеты ---');
  bus.on('demo', () => console.log('[priority 0] Низкий приоритет'), 0);
  bus.on('demo', () => console.log('[priority 10] Высокий приоритет'), 10);
  bus.on('demo', () => console.log('[priority 5] Средний приоритет'), 5);
  bus.emit('demo');
}

/**
 * Task 5: wildcard listeners.
 */
function showWildcard() {
  const bus = new EventBus({ group: config.group });

  console.log('--- Wildcard ---');
  bus.onAny((event, ...args) => {
    console.log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`);
  });
  bus.emit('greet', 'Иван');
  bus.emit('info', config.group);
}

/**
 * Task 5: the once cache.
 */
function showOnce() {
  const bus = new EventBus({ group: config.group });
  let calls = 0;

  console.log('--- Once-кэш ---');
  bus.on('tick', (number) => console.log(`[tick] Вызов ${number}`));
  bus.once('tick', () => {
    calls += 1;
  });

  for (let number = 1; number <= 3; number += 1) {
    bus.emit('tick', number);
  }

  console.log(`once-слушатель вызван: ${calls} ${plural(calls, 'раз', 'раза', 'раз')}`);
}

/**
 * Task 5: listener errors are caught, the "error" event keeps its special
 * status and a missing error listener throws.
 */
function showErrors() {
  const bus = new EventBus({ group: config.group });

  console.log('--- Обработка ошибок ---');

  bus.on('test', () => {
    throw new Error('Сбой в тестовом слушателе');
  });
  bus.on('test', () => console.log('[test] Второй слушатель продолжил работу'));

  bus.on('test2', () => {
    throw new Error('Второй тестовый сбой');
  });

  bus.emit('test');
  bus.emit('test2');

  bus.on(
    'error',
    (error) => console.log(`[ERROR] [${config.group}] Обработано событие error: ${error.message}`),
    100,
  );
  bus.emit('error', new Error('Тестовая ошибка шины'));

  try {
    const lonely = new EventBus({ group: config.group });
    lonely.emit('error', new Error('Ошибка без слушателя'));
  } catch (error) {
    console.log(`[ERROR] Перехвачено исключение error без слушателя: ${error.message}`);
  }
}

/**
 * Task 5: metrics.
 */
function showMetrics() {
  const bus = new EventBus({ group: config.group });

  bus.on('greet', () => {});
  bus.on('info', () => {});
  bus.on('tick', () => {});
  bus.on('test', () => {
    throw new Error('Сбой для метрик');
  });

  bus.emit('greet', 'Иван');
  bus.emit('greet', 'Мария');
  bus.emit('info', config.group);
  bus.emit('tick', 1);
  bus.emit('tick', 2);
  bus.emit('tick', 3);
  bus.emit('test');
  bus.emit('test');

  const metrics = bus.getMetrics();

  console.log('--- Метрики ---');
  for (const [event, count] of Object.entries(metrics.events)) {
    const errors = metrics.errors[event] || 0;
    const suffix = errors > 0 ? ` (ошибок: ${errors})` : '';
    console.log(`${event}: ${count} ${plural(count, 'вызов', 'вызова', 'вызовов')}${suffix}`);
  }
  console.log(`Всего событий: ${metrics.total}`);
  console.log(`Слушателей: ${JSON.stringify(metrics.listeners)}`);
}

/**
 * Task 5: HTTP server and os monitoring through the EventBus.
 * @param {number} port
 * @param {number} duration seconds, 0 means run until interrupted
 */
function startServer(port, duration) {
  const bus = new EventBus({ group: config.group });

  console.log('--- HTTP-сервер и мониторинг os ---');

  bus.on('request', (info) => console.log(`[http] ${info.method} ${info.url}`));
  bus.on('system', (info) => {
    console.log(
      `[system] [${config.group}] RAM: ${info.freePercent} свободно (${info.freeGb} ГБ), ` +
        `ядер: ${info.cores}, uptime: ${info.uptime}`,
    );
  });

  const server = http.createServer((request, response) => {
    bus.emit('request', { method: request.method, url: request.url, at: new Date().toISOString() });

    if (request.method === 'GET' && request.url.split('?')[0] === '/metrics') {
      const body = JSON.stringify(bus.getMetrics(), null, 2);
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(body);
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Not found' }));
  });

  server.on('error', (error) => {
    console.error(`Не удалось запустить сервер: ${error.message}`);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`HTTP-сервер: http://localhost:${port}/metrics`);
    console.log(`Мониторинг os каждые ${config.monitorInterval} мс, выход по Ctrl+C`);
  });

  const timer = setInterval(() => {
    const total = os.totalmem();
    const free = os.freemem();
    bus.emit('system', {
      freePercent: formatPercent(percentage(free, total)),
      freeGb: formatGb(free),
      cores: os.cpus().length,
      uptime: formatUptime(os.uptime()),
    });
  }, config.monitorInterval);

  function shutdown(reason) {
    clearInterval(timer);
    server.close(() => {
      console.log(`${reason} Сервер остановлен.`);
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('Мониторинг остановлен.'));

  if (duration > 0) {
    setTimeout(() => shutdown('Время работы истекло.'), duration * 1000);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = typeof args.section === 'string' ? args.section : 'all';

  if (!SECTIONS.includes(section)) {
    console.error(`Неизвестная секция "${section}". Доступные: ${SECTIONS.join(', ')}`);
    process.exit(1);
  }

  const port = args.port === undefined ? config.port : Number(args.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Флаг --port принимает целое число от 1 до 65535.');
    process.exit(1);
  }

  const duration = args.duration === undefined ? 0 : Number(args.duration);
  if (!Number.isFinite(duration) || duration < 0) {
    console.error('Флаг --duration принимает неотрицательное число секунд.');
    process.exit(1);
  }

  console.log(`=== EventBus (группа ${config.group}) ===`);

  if (section === 'all' || section === 'priority') {
    showPriority();
  }

  if (section === 'all' || section === 'wildcard') {
    showWildcard();
  }

  if (section === 'all' || section === 'once') {
    showOnce();
  }

  if (section === 'all' || section === 'errors') {
    showErrors();
  }

  if (section === 'all' || section === 'metrics') {
    showMetrics();
  }

  if (section === 'server') {
    startServer(port, duration);
  }
}

main();
