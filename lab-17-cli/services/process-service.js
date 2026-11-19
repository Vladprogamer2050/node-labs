'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

/** Turns a shell-style mask (a*.txt) into a regular expression. */
function maskToRegExp(mask) {
  const escaped = mask.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

function hasWildcard(value) {
  return /[*?]/.test(value);
}

/**
 * Expands file masks like "*.txt" using the real file system. cmd.exe does not
 * expand wildcards for Node.js, so the CLI does it itself.
 */
function expandFiles(patterns, cwd = '.') {
  const files = [];
  const missing = [];

  for (const pattern of patterns) {
    if (hasWildcard(pattern)) {
      const dirPart = path.dirname(pattern);
      const mask = path.basename(pattern);
      const dir = path.resolve(cwd, dirPart === '.' ? '.' : dirPart);

      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        missing.push(pattern);
        continue;
      }

      const matcher = maskToRegExp(mask);
      const matches = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && matcher.test(entry.name))
        .map((entry) => path.join(dirPart === '.' ? '' : dirPart, entry.name))
        .sort();

      if (matches.length === 0) missing.push(pattern);
      else files.push(...matches);
      continue;
    }

    const absolute = path.resolve(cwd, pattern);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) files.push(pattern);
    else missing.push(pattern);
  }

  return { files, missing };
}

/** Real statistics for one file: size, lines, words and a content hash. */
async function collectFileStats(file, cwd = '.') {
  const absolute = path.resolve(cwd, file);
  const buffer = await fsp.readFile(absolute);
  const text = buffer.toString('utf8');
  const rows = text.split(/\r?\n/);
  if (rows.length > 0 && rows[rows.length - 1] === '') rows.pop();

  return {
    file: file.replace(/\\/g, '/'),
    bytes: buffer.length,
    lines: rows.length,
    words: text.trim() === '' ? 0 : text.trim().split(/\s+/).length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processes every file one by one. `delayMs` imitates a long operation so the
 * progress bar is visible; it is disabled (0) in tests and in non-TTY mode.
 */
async function processFiles({ patterns, cwd = '.', delayMs = 0, onProgress = null } = {}) {
  if (!patterns || patterns.length === 0) {
    return { total: 0, processed: 0, skipped: 0, files: [], missing: [] };
  }

  const { files, missing } = expandFiles(patterns, cwd);
  const result = [];

  for (let index = 0; index < files.length; index += 1) {
    const stats = await collectFileStats(files[index], cwd);
    result.push(stats);
    if (onProgress) onProgress(index + 1, files.length, stats.file);
    if (delayMs > 0) await sleep(delayMs);
  }

  return {
    total: files.length + missing.length,
    processed: files.length,
    skipped: missing.length,
    files: result,
    missing,
  };
}

module.exports = { expandFiles, collectFileStats, processFiles, maskToRegExp };
