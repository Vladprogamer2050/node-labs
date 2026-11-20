'use strict';

const GB = 1024 ** 3;

/**
 * Chooses the Russian plural form for a number.
 * @param {number} value
 * @param {string} one
 * @param {string} few
 * @param {string} many
 * @returns {string}
 */
function plural(value, one, few, many) {
  const absolute = Math.abs(Math.trunc(value));
  const mod10 = absolute % 10;
  const mod100 = absolute % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/**
 * Formats seconds as "1 д 2 ч 3 мин 4 сек".
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
 * Converts bytes to gigabytes.
 * @param {number} bytes
 * @returns {number}
 */
function toGigabytes(bytes) {
  return Number(bytes) / GB;
}

/**
 * Formats bytes as GB with two digits.
 * @param {number} bytes
 * @returns {string}
 */
function formatGb(bytes) {
  return toGigabytes(bytes).toFixed(2);
}

/**
 * Returns part as a percentage of total.
 * @param {number} part
 * @param {number} total
 * @returns {number}
 */
function percentage(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

/**
 * Formats a percentage with one digit.
 * @param {number} value
 * @returns {string}
 */
function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

module.exports = {
  plural,
  formatUptime,
  toGigabytes,
  formatGb,
  percentage,
  formatPercent,
};
