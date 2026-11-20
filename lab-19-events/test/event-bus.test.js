'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { EventBus } = require('../lib/event-bus');

/**
 * Runs a function while capturing console.log output produced by the bus.
 * @param {Function} action
 * @returns {string[]}
 */
function captureLogs(action) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  try {
    action();
  } finally {
    console.log = original;
  }
  return lines;
}

test('priority listeners run from higher to lower priority', () => {
  const bus = new EventBus({ group: '478' });
  const order = [];

  bus.on('demo', () => order.push('low'), 0);
  bus.on('demo', () => order.push('high'), 10);
  bus.on('demo', () => order.push('medium'), 5);
  bus.emit('demo');

  assert.deepEqual(order, ['high', 'medium', 'low']);
});

test('equal priorities keep the registration order', () => {
  const bus = new EventBus({ group: '478' });
  const order = [];

  bus.on('demo', () => order.push('first'), 5);
  bus.on('demo', () => order.push('second'), 5);
  bus.on('demo', () => order.push('third'), 5);
  bus.emit('demo');

  assert.deepEqual(order, ['first', 'second', 'third']);
});

test('once listeners run exactly once and are removed', () => {
  const bus = new EventBus({ group: '478' });
  let calls = 0;

  bus.once('tick', () => {
    calls += 1;
  });

  bus.emit('tick');
  bus.emit('tick');
  bus.emit('tick');

  assert.equal(calls, 1);
  assert.equal(bus.listenerCount('tick'), 0);
});

test('onAny receives the event name and all arguments', () => {
  const bus = new EventBus({ group: '478' });
  const received = [];

  bus.onAny((event, ...args) => received.push([event, ...args]));
  bus.emit('greet', 'Иван');
  bus.emit('info', '478');

  assert.deepEqual(received, [
    ['greet', 'Иван'],
    ['info', '478'],
  ]);
});

test('off removes only the requested listener', () => {
  const bus = new EventBus({ group: '478' });
  function first() {}
  function second() {}

  bus.on('demo', first);
  bus.on('demo', second);
  bus.off('demo', first);

  assert.equal(bus.listenerCount('demo'), 1);
  assert.deepEqual(bus.listeners('demo'), [second]);
});

test('emit reports whether anyone was listening', () => {
  const bus = new EventBus({ group: '478' });

  assert.equal(bus.emit('missing'), false);
  bus.on('present', () => {});
  assert.equal(bus.emit('present'), true);
  bus.onAny(() => {});
  assert.equal(bus.emit('missing'), true);
});

test('listener exceptions are caught, counted and do not stop other listeners', () => {
  const bus = new EventBus({ group: '478' });
  let secondRan = false;

  bus.on('test', () => {
    throw new Error('boom');
  });
  bus.on('test', () => {
    secondRan = true;
  });

  const logs = captureLogs(() => bus.emit('test'));
  const metrics = bus.getMetrics();

  assert.equal(secondRan, true);
  assert.equal(metrics.errors.test, 1);
  assert.equal(metrics.events.test, 1);
  assert.match(logs[0], /\[ERROR\] \[478\] Ошибка в слушателе "test": boom/);
});

test('error event without a listener throws', () => {
  const bus = new EventBus({ group: '478' });

  assert.throws(() => bus.emit('error', new Error('no listener')), /no listener/);
});

test('error event with a listener is handled normally', () => {
  const bus = new EventBus({ group: '478' });
  let message = null;

  bus.on('error', (error) => {
    message = error.message;
  });

  assert.equal(bus.emit('error', new Error('handled')), true);
  assert.equal(message, 'handled');
});

test('metrics count events, errors, total and last call time', () => {
  const bus = new EventBus({ group: '478' });

  bus.on('greet', () => {});
  bus.emit('greet', 'Иван');
  bus.emit('greet', 'Мария');
  bus.emit('unknown');

  const metrics = bus.getMetrics();

  assert.equal(metrics.group, '478');
  assert.equal(metrics.events.greet, 2);
  assert.equal(metrics.events.unknown, 1);
  assert.equal(metrics.total, 3);
  assert.equal(metrics.listeners.greet, 1);
  assert.ok(metrics.lastCalled.greet);
});
