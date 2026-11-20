'use strict';

const GB = 1024 ** 3;

/**
 * Pads a number to two digits: 7 -> "07".
 * @param {number} value
 * @returns {string}
 */
function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Formats a duration in seconds as a human readable Russian string.
 * Days are shown only when they are non-zero.
 * Example: 90061 -> "1 д 1 ч 1 мин 1 сек".
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} д`);
  parts.push(`${hours} ч`, `${minutes} мин`, `${secs} сек`);
  return parts.join(' ');
}

/**
 * Masks the last three octets of a MAC address: AA:BB:CC:**:**:**
 * Returns "нет" for missing or all-zero addresses.
 * @param {string|null|undefined} mac
 * @returns {string}
 */
function maskMac(mac) {
  if (!mac) return 'нет';

  const normalized = String(mac).toUpperCase();
  if (normalized === '00:00:00:00:00:00') return 'нет';

  const octets = normalized.split(':');
  if (octets.length !== 6) return normalized;

  return `${octets.slice(0, 3).join(':')}:**:**:**`;
}

/**
 * Returns the platform-dependent message required by task 1.
 * @param {string} platform value of os.platform()
 * @returns {string}
 */
function platformMessage(platform) {
  switch (platform) {
    case 'win32':
      return 'Вы работаете в Windows';
    case 'linux':
      return 'Вы работаете в Linux';
    case 'darwin':
      return 'Вы работаете в macOS';
    default:
      return 'Неизвестная платформа';
  }
}

/**
 * Converts bytes to gigabytes.
 * @param {number} bytes
 * @returns {number}
 */
function toGigabytes(bytes) {
  return Number(bytes) / GB;
}

/**
 * Converts bytes to gigabytes and formats the value with fixed precision.
 * @param {number} bytes
 * @param {number} [digits]
 * @returns {string}
 */
function formatGb(bytes, digits = 2) {
  return toGigabytes(bytes).toFixed(digits);
}

/**
 * Returns part as a percentage of total, 0 when total is not positive.
 * @param {number} part
 * @param {number} total
 * @returns {number}
 */
function percentage(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

/**
 * Formats a percentage value with fixed precision.
 * @param {number} value
 * @param {number} [digits]
 * @returns {string}
 */
function formatPercent(value, digits = 1) {
  return `${Number(value).toFixed(digits)}%`;
}

/**
 * Formats a date as "YYYY-MM-DD HH:MM:SS" in local time.
 * @param {Date} date
 * @returns {string}
 */
function formatTimestamp(date) {
  const stamp = [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-');

  const time = [pad2(date.getHours()), pad2(date.getMinutes()), pad2(date.getSeconds())].join(':');
  return `${stamp} ${time}`;
}

/**
 * Builds a log line in the format required by task 4:
 * [YYYY-MM-DD HH:MM:SS] [478] Предупреждение: ...
 * @param {Date} date
 * @param {string|number} group
 * @param {string} message
 * @returns {string}
 */
function formatLogLine(date, group, message) {
  return `[${formatTimestamp(date)}] [${group}] Предупреждение: ${message}`;
}

module.exports = {
  pad2,
  formatUptime,
  maskMac,
  platformMessage,
  toGigabytes,
  formatGb,
  percentage,
  formatPercent,
  formatTimestamp,
  formatLogLine,
};
