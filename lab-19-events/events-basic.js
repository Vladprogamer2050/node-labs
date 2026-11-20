#!/usr/bin/env node
'use strict';

const { EventEmitter } = require('node:events');

const config = require('./config');
const { parseArgs } = require('./lib/args');

const SECTIONS = ['all', 'events', 'emit'];

/**
 * Creates an emitter with listeners for greet, info and bye.
 * @returns {EventEmitter}
 */
function createEmitter() {
  const emitter = new EventEmitter();

  emitter.on('greet', (name) => console.log(`[greet] Привет, ${name}!`));
  emitter.on('info', () => console.log(`[info] Группа: ${config.group}`));
  emitter.on('bye', () => console.log('[bye] До свидания!'));

  return emitter;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = typeof args.section === 'string' ? args.section : 'all';
  const name = typeof args.name === 'string' ? args.name : 'Иван';

  if (!SECTIONS.includes(section)) {
    console.error(`Неизвестная секция "${section}". Доступные: ${SECTIONS.join(', ')}`);
    process.exit(1);
  }

  if (section === 'all' || section === 'events') {
    console.log('=== Демонстрация EventEmitter ===');
  }

  const emitter = createEmitter();
  const greetResult = emitter.emit('greet', name);
  const infoResult = emitter.emit('info');
  const byeResult = emitter.emit('bye');
  const unknownResult = emitter.emit('unknown');

  if (section === 'events') return;

  if (section === 'all') {
    console.log(`Событие "unknown" без слушателей: ${unknownResult}`);
    console.log(`Событие "greet" со слушателями: ${greetResult}`);
    return;
  }

  console.log('=== Возвращаемое значение emit() ===');
  console.log(`Событие "greet" со слушателями: ${greetResult}`);
  console.log(`Событие "info" со слушателями: ${infoResult}`);
  console.log(`Событие "bye" со слушателями: ${byeResult}`);
  console.log(`Событие "unknown" без слушателей: ${unknownResult}`);
}

main();
