'use strict';

/**
 * Lab 14 - small shared helpers (paths, formatting, recursive walking).
 * Only fs.promises and the path module are used.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

/** Print a titled block to the console. */
function header(title) {
  const line = '='.repeat(60);
  console.log(line);
  console.log(title);
  console.log(line);
}

/** Human readable file size: 1536 -> "1.50 KB". */function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(2)} ${units[index]}`;
}

/** Russian plural forms: 1 файл, 3 файла, 5 файлов. */
function plural(count, forms) {
  const [one, few, many] = forms;
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** mkdir -p */async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

/** rm -rf that does not fail when the path is already gone. */
async function removeDir(dir) {
  await fsp.rm(dir, { recursive: true, force: true });
}

/**
 * Recursively collect entries of `root`.
 * Returns { files: [{ absPath, relPath, size, ext }], dirs: [relPath] }.
 * `ignoreDirs` - directory names to skip (variant 7: node_modules and .git).
 */
async function walk(root, { ignoreDirs = [] } = {}) {
  const files = [];
  const dirs = [];
  const ignore = new Set(ignoreDirs);

  async function visit(current, relative) {
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (error) {
      // Unreadable folder must not stop the whole scan.
      console.warn(`  [skip] cannot read ${current}: ${error.code}`);
      return;
    }

    for (const entry of entries) {
      const absPath = path.join(current, entry.name);
      const relPath = relative ? path.join(relative, entry.name) : entry.name;

      if (entry.isDirectory()) {
        if (ignore.has(entry.name)) continue;
        dirs.push(relPath);
        await visit(absPath, relPath);
      } else if (entry.isFile()) {
        const stat = await fsp.stat(absPath);
        files.push({
          absPath,
          relPath,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          ext: path.extname(entry.name).toLowerCase() || '(no extension)',
        });
      }
    }
  }

  await visit(root, '');
  return { files, dirs };
}

/** Draw an ASCII tree of a directory. */
async function printTree(root, { indent = '' } = {}) {
  const entries = await fsp.readdir(root, { withFileTypes: true });
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const last = i === entries.length - 1;
    console.log(`${indent}${last ? '└── ' : '├── '}${entry.name}${entry.isDirectory() ? '/' : ''}`);
    if (entry.isDirectory()) {
      await printTree(path.join(root, entry.name), {
        indent: `${indent}${last ? '    ' : '│   '}`,
      });
    }
  }
}

module.exports = { header, formatBytes, plural, ensureDir, removeDir, walk, printTree };
