'use strict';

const pad = (value) => String(value).padStart(2, '0');

/**
 * "2026-11-18 14:30:25" - log timestamp, exactly the format required by task 3.1.
 */
function formatLogTime(date = new Date()) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** "18.11.2026 14:30:25" - human readable date for the HTML page. */
function formatRussianTime(date = new Date()) {
  return (
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Show only the beginning of the Authorization header value.
 * Tokens must never be written to the console or returned as is.
 */
function maskAuthorization(header) {
  const [scheme, ...rest] = String(header).split(' ');
  const token = rest.join(' ');

  if (!token) return `${scheme.slice(0, 6)}***`;
  return `${scheme} ${token.slice(0, 4)}***`;
}

module.exports = { formatLogTime, formatRussianTime, maskAuthorization };
