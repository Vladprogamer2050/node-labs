'use strict';

const fs = require('fs');
const path = require('path');
const { OPERATIONS_LOG } = require('../config');
const { formatLogTime } = require('./time');

/**
 * Task 4 - every operation is written to a log file.
 *
 * The file is opened in append mode; writes go through a promise queue, so
 * concurrent requests never interleave parts of two lines. The log directory is
 * git-ignored and created on start.
 */
const LOG_FILE = path.join(__dirname, '..', OPERATIONS_LOG);
fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

let queue = Promise.resolve();

function sanitize(value) {
  return String(value).replace(/[\r\n]+/g, ' ').slice(0, 300);
}

function logOperation(action, { user = null, bookId = null, details = null } = {}) {
  const parts = [`[${formatLogTime()}]`, action];

  if (bookId !== null) parts.push(`book=${bookId}`);
  if (user) parts.push(`user=${sanitize(user)}`);
  if (details) parts.push(`"${sanitize(details)}"`);

  const line = `${parts.join(' ')}\n`;

  queue = queue
    .then(() => fs.promises.appendFile(LOG_FILE, line, 'utf8'))
    .catch((error) => console.error(`[log] не удалось записать операцию: ${error.message}`));

  return queue;
}

/** Last lines of the operation log, newest last (used by /api/admin/logs). */
async function readRecentOperations(limit = 20) {
  try {
    const content = await fs.promises.readFile(LOG_FILE, 'utf8');
    return content.split(/\r?\n/).filter(Boolean).slice(-limit);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

module.exports = { logOperation, readRecentOperations, LOG_FILE };
