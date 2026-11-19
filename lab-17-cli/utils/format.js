'use strict';

/**
 * Small formatting helpers shared by the commands and the services.
 */

function pad(value) {
  return String(value).padStart(2, '0');
}

/** Local date in the YYYY-MM-DD form (not UTC, so it matches the user clock). */
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time in the HH:MM:SS form. */
function localTime(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 4565 -> "4.5 KB", 35209 -> "34.4 KB". */
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

/** 2300 -> "2.3s", 250 -> "250ms". */
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Human readable project type: "cli" -> "CLI-утилита". */
function typeLabel(type, types) {
  const found = types.find((item) => item.value === type);
  return found ? found.name : type;
}

/** "typescript, prettier" -> "TypeScript, Prettier". */
function optionLabels(values, options) {
  if (!values || values.length === 0) return 'нет';
  return values
    .map((value) => {
      const found = options.find((item) => item.value === value);
      return found ? found.name : value;
    })
    .join(', ');
}

module.exports = {
  localDate,
  localTime,
  formatBytes,
  formatDuration,
  typeLabel,
  optionLabels,
};
