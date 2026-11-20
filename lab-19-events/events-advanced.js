#!/usr/bin/env node
'use strict';

const { EventEmitter } = require('node:events');

const config = require('./config');
const { parseArgs } = require('./lib/args');

const SECTIONS = ['all', 'new', 'remove', 'plugins', 'leak', 'async'];
const PREFIX = `[${config.group}]`;

/**
 * Task 4: plugin system built on top of EventEmitter.
 */
class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();
  }

  /**
   * Attaches the plugin handler and emits plugin:registered.
   * @param {{ name: string, event: string, handler: Function }} plugin
   */
  registerPlugin(plugin) {
    this.plugins.set(plugin.name, plugin);
    this.on(plugin.event, plugin.handler);
    this.emit('plugin:registered', plugin.name);
    return this;
  }

  /**
   * Removes the plugin handler and emits plugin:removed.
   * @param {string} name
   */
  unregisterPlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return this;

    this.removeListener(plugin.event, plugin.handler);
    this.plugins.delete(name);
    this.emit('plugin:removed', name);
    return this;
  }
}

/**
 * Creates a manager that logs newListener/removeListener and plugin events.
 * @returns {PluginManager}
 */
function createManager() {
  const manager = new PluginManager();

  manager.on('newListener', (event) => console.log(`[newListener] Добавлен слушатель "${event}"`));
  manager.on('removeListener', (event) => console.log(`[removeListener] Удалён слушатель "${event}"`));
  manager.on('plugin:registered', (name) => console.log(`[PLUGIN] Зарегистрирован: ${name}`));
  manager.on('plugin:removed', (name) => console.log(`[PLUGIN] Удалён: ${name}`));

  return manager;
}

function createPlugins() {
  return {
    logger: {
      name: 'LoggerPlugin',
      event: 'log',
      handler: (message) => console.log(`[LoggerPlugin] ${message}`),
    },
    alert: {
      name: 'AlertPlugin',
      event: 'alert',
      handler: (message) => console.log(`[AlertPlugin] ${message}`),
    },
  };
}

function showNewListener() {
  const manager = new PluginManager();
  manager.on('newListener', (event) => console.log(`[newListener] Добавлен слушатель "${event}"`));

  console.log('=== Событие newListener ===');
  manager.on('demo', () => {});
  manager.on('demo', () => {});
  manager.on('other', () => {});
  console.log(`Слушателей у события "demo": ${manager.listenerCount('demo')}`);
  console.log('Событие newListener срабатывает до добавления каждого слушателя.');
}

function showRemoveListener() {
  const manager = createManager();
  const { logger } = createPlugins();

  console.log('=== Событие removeListener ===');
  manager.registerPlugin(logger);
  manager.unregisterPlugin(logger.name);
  console.log(`Слушателей у события "log": ${manager.listenerCount('log')}`);
}

function showPlugins() {
  const manager = createManager();
  const { logger, alert } = createPlugins();

  console.log('=== Система плагинов ===');
  manager.registerPlugin(logger);
  manager.emit('log', 'Сообщение через LoggerPlugin');
  manager.registerPlugin(alert);
  manager.emit('alert', 'Тревога через AlertPlugin');
  manager.unregisterPlugin(logger.name);
  console.log(`Активных плагинов: ${manager.plugins.size}`);
}

function showLeak() {
  const emitter = new EventEmitter();
  // Listeners are added intentionally and without the default warning.
  emitter.setMaxListeners(0);

  function leaky() {}

  console.log('=== Демонстрация утечки ===');
  for (let index = 0; index < 10; index += 1) {
    emitter.on('leak', leaky);
  }
  console.log(`Слушателей до: ${emitter.listenerCount('leak')}`);

  for (let index = 0; index < 1000; index += 1) {
    emitter.on('leak', leaky);
  }
  console.log(`Слушателей после добавления 1000: ${emitter.listenerCount('leak')}`);

  emitter.removeAllListeners('leak');
  console.log(`Слушателей после removeAllListeners: ${emitter.listenerCount('leak')}`);
}

function showAsync() {
  const emitter = new EventEmitter();

  console.log('=== Асинхронные слушатели ===');

  emitter.on('async', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`${PREFIX} async-слушатель завершён через 100ms`);
  });

  emitter.on('async', () => {
    console.log(`${PREFIX} emit вызван (не ждёт async-слушатель)`);
    setImmediate(() => {
      console.log(`${PREFIX} setImmediate: отложенный код выполнен после emit`);
    });
  });

  emitter.emit('async');
  console.log(`${PREFIX} emit вернул управление синхронно`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = typeof args.section === 'string' ? args.section : 'all';

  if (!SECTIONS.includes(section)) {
    console.error(`Неизвестная секция "${section}". Доступные: ${SECTIONS.join(', ')}`);
    process.exit(1);
  }

  if (section === 'all' || section === 'plugins') {
    showPlugins();
    console.log('');
  }

  if (section === 'all' || section === 'new') {
    showNewListener();
    console.log('');
  }

  if (section === 'all' || section === 'remove') {
    showRemoveListener();
    console.log('');
  }

  if (section === 'all' || section === 'leak') {
    showLeak();
    console.log('');
  }

  if (section === 'all' || section === 'async') {
    showAsync();
  }
}

main();
