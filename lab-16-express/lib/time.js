'use strict';

const pad = (value) => String(value).padStart(2, '0');

/** "2026-11-18 14:30:25" - the format required by task 3.1. */
function formatLogTime(date = new Date()) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** "18.11.2026 14:30:25" - human readable date for the HTML pages. */
function formatRussianTime(date = new Date()) {
  return (
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

module.exports = { formatLogTime, formatRussianTime };
