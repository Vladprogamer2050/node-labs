#!/usr/bin/env node
'use strict';

const { EventEmitter } = require('node:events');

const config = require('./config');
const { parseArgs } = require('./lib/args');
const { plural } = require('./lib/format');

const SECTIONS = ['all', 'once', 'counts', 'remove', 'order'];

function first() {}
function second() {}
function third() {}

/**
 * Demonstrates on() versus once() on three emits.
 */
function showOnce() {
  const emitter = new EventEmitter();
  let onCalls = 0;
  let onceCalls = 0;

  emitter.on('tick', (number) => {
    onCalls += 1;
    console.log(`[tick #${number}] on-слушатель`);
  });

  emitter.once('tick', (number) => {
    onceCalls += 1;
    console.log(`[tick #${number}] once-слушатель`);
  });

  for (let number = 1; number <= 3; number += 1) {
    emitter.emit('tick', number);
  }

  console.log(`on-слушатель вызван: ${onCalls} ${plural(onCalls, 'раз', 'раза', 'раз')}`);
  console.log(`once-слушатель вызван: ${onceCalls} ${plural(onceCalls, 'раз', 'раза', 'раз')}`);
}

/**
 * Shows listenerCount() and listeners().
 */
function showCounts() {
  const emitter = new EventEmitter();
  emitter.on('tick', first);
  emitter.on('tick', second);
  emitter.on('tick', third);
  emitter.on('other', first);

  console.log(`Слушателей у события "tick": ${emitter.listenerCount('tick')}`);
  console.log(`Слушатели "tick": ${emitter.listeners('tick').map((listener) => listener.name).join(', ')}`);
  console.log(`Слушателей у события "other": ${emitter.listenerCount('other')}`);
  console.log(`Слушателей у события "missing": ${emitter.listenerCount('missing')}`);
}

/**
 * Shows removeListener() and removeAllListeners().
 */
function showRemove() {
  const emitter = new EventEmitter();
  emitter.on('tick', first);
  emitter.on('tick', second);
  emitter.on('tick', third);

  console.log(`Слушателей до удаления: ${emitter.listenerCount('tick')}`);
  emitter.removeListener('tick', second);
  console.log(`Слушателей после удаления одного: ${emitter.listenerCount('tick')}`);
  emitter.removeAllListeners('tick');
  console.log(`Слушателей после removeAllListeners: ${emitter.listenerCount('tick')}`);
  console.log(`Массив listeners("tick"): [${emitter.listeners('tick').join(', ')}]`);
}

/**
 * Shows that listeners are called in the order they were added.
 */
function showOrder() {
  const emitter = new EventEmitter();

  emitter.on('order', () => console.log(`1. Первый слушатель (группа ${config.group})`));
  emitter.on('order', () => console.log('2. Второй слушатель'));
  emitter.on('order', () => console.log('3. Третий слушатель'));

  emitter.emit('order');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = typeof args.section === 'string' ? args.section : 'all';

  if (!SECTIONS.includes(section)) {
    console.error(`Неизвестная секция "${section}". Доступные: ${SECTIONS.join(', ')}`);
    process.exit(1);
  }

  if (section === 'all' || section === 'once') {
    console.log('=== Сравнение on и once ===');
    showOnce();
    console.log('');
  }

  if (section === 'all' || section === 'counts') {
    console.log('=== Управление подписками ===');
    showCounts();
    console.log('');
  }

  if (section === 'all' || section === 'remove') {
    console.log('=== Удаление слушателей ===');
    showRemove();
    console.log('');
  }

  if (section === 'all' || section === 'order') {
    console.log('=== Порядок вызова ===');
    showOrder();
  }
}

main();
