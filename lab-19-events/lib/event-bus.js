'use strict';

const { EventEmitter } = require('node:events');

/**
 * Task 5: EventEmitter with listener priorities, once cache, wildcard
 * listeners, per-event metrics and safe listener invocation.
 *
 * The listener registry is kept separately from EventEmitter because the
 * built-in emitter invokes listeners strictly in registration order and does
 * not support priorities.
 */
class EventBus extends EventEmitter {
  /**
   * @param {{ group?: string }} [options]
   */
  constructor(options = {}) {
    super();
    this.group = options.group || '478';
    this.registry = new Map();
    this.wildcards = [];
    this.order = 0;
    this.metrics = {
      events: Object.create(null),
      errors: Object.create(null),
      lastCalled: Object.create(null),
      total: 0,
    };
  }

  /**
   * Adds a listener with an optional priority (higher runs earlier).
   * @param {string} event
   * @param {Function} listener
   * @param {number} [priority]
   * @returns {this}
   */
  on(event, listener, priority = 0) {
    this.addEntry(event, listener, priority, false);
    return this;
  }

  /**
   * Adds a one-time listener.
   * @param {string} event
   * @param {Function} listener
   * @param {number} [priority]
   * @returns {this}
   */
  once(event, listener, priority = 0) {
    this.addEntry(event, listener, priority, true);
    return this;
  }

  /**
   * Removes a listener from the event.
   * @param {string} event
   * @param {Function} listener
   * @returns {this}
   */
  off(event, listener) {
    const entries = this.registry.get(event);
    if (!entries) return this;

    const filtered = entries.filter((entry) => entry.listener !== listener);
    if (filtered.length === 0) {
      this.registry.delete(event);
    } else {
      this.registry.set(event, filtered);
    }
    return this;
  }

  /**
   * Subscribes to every event (wildcard).
   * @param {Function} listener called as listener(eventName, ...args)
   * @returns {this}
   */
  onAny(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Слушатель onAny должен быть функцией');
    }
    this.wildcards.push(listener);
    return this;
  }

  /**
   * Removes a wildcard listener.
   * @param {Function} listener
   * @returns {this}
   */
  offAny(listener) {
    this.wildcards = this.wildcards.filter((item) => item !== listener);
    return this;
  }

  /**
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    const entries = this.registry.get(event);
    return entries ? entries.length : 0;
  }

  /**
   * @param {string} event
   * @returns {Function[]}
   */
  listeners(event) {
    return (this.registry.get(event) || []).map((entry) => entry.listener);
  }

  /**
   * @returns {string[]}
   */
  eventNames() {
    return [...this.registry.keys()];
  }

  /**
   * Emits an event. Listeners run by priority, once listeners are removed
   * before the call, and exceptions from listeners are caught and reported.
   * @param {string} event
   * @param {...*} args
   * @returns {boolean} true when at least one listener or wildcard exists
   */
  emit(event, ...args) {
    this.metrics.total += 1;
    this.metrics.events[event] = (this.metrics.events[event] || 0) + 1;
    this.metrics.lastCalled[event] = new Date().toISOString();

    const entries = [...(this.registry.get(event) || [])];

    for (const entry of entries) {
      if (entry.once) this.removeEntry(event, entry);
      try {
        entry.listener(...args);
      } catch (error) {
        this.reportListenerError(event, error);
      }
    }

    for (const listener of [...this.wildcards]) {
      try {
        listener(event, ...args);
      } catch (error) {
        this.reportListenerError(`onAny(${event})`, error);
      }
    }

    // The "error" event has special semantics: without a listener it throws.
    if (event === 'error' && entries.length === 0) {
      const error = args[0] instanceof Error ? args[0] : new Error(String(args[0]));
      throw error;
    }

    return entries.length > 0 || this.wildcards.length > 0;
  }

  /**
   * Returns a snapshot of counters, listener counts and timestamps.
   * @returns {object}
   */
  getMetrics() {
    const listeners = {};
    for (const [event, entries] of this.registry) {
      listeners[event] = entries.length;
    }

    return {
      group: this.group,
      events: { ...this.metrics.events },
      total: this.metrics.total,
      listeners,
      errors: { ...this.metrics.errors },
      lastCalled: { ...this.metrics.lastCalled },
    };
  }

  /**
   * @param {string} event
   * @param {Function} listener
   * @param {number} priority
   * @param {boolean} once
   */
  addEntry(event, listener, priority, once) {
    if (typeof listener !== 'function') {
      throw new TypeError(`Слушатель события "${event}" должен быть функцией`);
    }

    const entries = this.registry.get(event) || [];
    entries.push({
      listener,
      priority: Number(priority) || 0,
      once,
      order: this.order,
    });
    this.order += 1;
    entries.sort((first, second) => second.priority - first.priority || first.order - second.order);
    this.registry.set(event, entries);
  }

  /**
   * @param {string} event
   * @param {object} entry
   */
  removeEntry(event, entry) {
    const entries = this.registry.get(event);
    if (!entries) return;

    const index = entries.indexOf(entry);
    if (index !== -1) entries.splice(index, 1);
    if (entries.length === 0) this.registry.delete(event);
  }

  /**
   * Logs a listener failure and counts it in the metrics.
   * @param {string} event
   * @param {Error} error
   */
  reportListenerError(event, error) {
    this.metrics.errors[event] = (this.metrics.errors[event] || 0) + 1;
    console.log(`[ERROR] [${this.group}] Ошибка в слушателе "${event}": ${error.message}`);
  }
}

module.exports = { EventBus };
