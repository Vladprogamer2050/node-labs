#!/usr/bin/env node
'use strict';

const { EventEmitter } = require('node:events');

const config = require('./config');
const { parseArgs } = require('./lib/args');

const SECTIONS = ['all', 'work', 'error', 'crash'];

/**
 * Task 3: a database connection modelled as an EventEmitter.
 */
class DatabaseConnection extends EventEmitter {
  /**
   * @param {{ group?: string }} [options]
   */
  constructor(options = {}) {
    super();
    this.group = options.group || config.group;
    this.connected = false;
  }

  connect() {
    this.connected = true;
    this.emit('connect');
    return this;
  }

  /**
   * Executes a query. The result is deterministic and simulated: the lab has
   * no real database, the rows are computed by simulate() and labelled as such.
   * @param {string} sql
   */
  query(sql) {
    if (!this.connected) {
      this.error(new Error('Нет активного соединения'));
      return this;
    }

    this.emit('query', sql, this.simulate(sql));
    return this;
  }

  close() {
    this.connected = false;
    this.emit('close');
    return this;
  }

  /**
   * Emits the special "error" event.
   * @param {Error} error
   */
  error(error) {
    this.emit('error', error);
    return this;
  }

  /**
   * Deterministic simulated result of a SQL statement.
   * @param {string} sql
   * @returns {{ rows: number, message: string }}
   */
  simulate(sql) {
    if (/^select/i.test(sql)) return { rows: 50, message: '50 записей' };
    if (/^insert/i.test(sql)) return { rows: 1, message: '1 запись добавлена' };
    if (/^update/i.test(sql)) return { rows: 3, message: '3 записи обновлены' };
    if (/^delete/i.test(sql)) return { rows: 2, message: '2 записи удалены' };
    return { rows: 0, message: '0 записей' };
  }
}

/**
 * Builds a connection with logging listeners for every event.
 * @returns {DatabaseConnection}
 */
function createLoggedConnection() {
  const db = new DatabaseConnection();

  db.on('connect', () => console.log('[EVENT] Соединение установлено'));
  db.on('query', (sql, result) => {
    console.log(`[EVENT] Выполнение запроса: ${sql}`);
    console.log(`[EVENT] Результат: ${result.message}`);
  });
  db.on('close', () => console.log('[EVENT] Соединение закрыто'));
  db.on('error', (error) => {
    console.log(`[EVENT] Ошибка: ${error.message} (обработана слушателем)`);
  });

  return db;
}

function showWork() {
  const db = createLoggedConnection();

  console.log(`=== DatabaseConnection (группа ${config.group}) ===`);
  console.log('[EVENT] Подключение к БД...');
  db.connect();
  db.query('SELECT * FROM students');
  db.query('INSERT INTO students (name) VALUES (?)');
  db.query('UPDATE students SET group_id = 1 WHERE id = 7');
  console.log('[EVENT] Закрытие соединения');
  db.close();
}

function showErrorHandled() {
  const db = createLoggedConnection();

  console.log('=== Демонстрация ошибки ===');
  console.log(`Слушателей error: ${db.listenerCount('error')}`);
  db.connect();
  db.error(new Error('Connection timeout'));
  console.log('Процесс продолжил работу: ошибка обработана слушателем.');
}

function showCrash() {
  const db = new DatabaseConnection();

  console.log('=== Демонстрация падения без слушателя error ===');
  console.log(`Слушателей error: ${db.listenerCount('error')}`);
  console.log('Вызываем db.error(new Error("Connection timeout"))...');
  db.error(new Error('Connection timeout'));
  console.log('Эта строка не выполнится.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = args.crash === true ? 'crash' : typeof args.section === 'string' ? args.section : 'all';

  if (!SECTIONS.includes(section)) {
    console.error(`Неизвестная секция "${section}". Доступные: ${SECTIONS.join(', ')}`);
    process.exit(1);
  }

  if (section === 'all' || section === 'work') {
    showWork();
    console.log('');
  }

  if (section === 'all' || section === 'error') {
    showErrorHandled();
  }

  if (section === 'crash') {
    showCrash();
  }
}

main();
