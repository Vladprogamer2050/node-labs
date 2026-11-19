'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  expandFiles,
  collectFileStats,
  processFiles,
  maskToRegExp,
} = require('../../services/process-service');

function tempDir(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab17-process-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

describe('process service', () => {
  test('converts a mask to a regular expression', () => {
    expect(maskToRegExp('*.txt').test('notes.txt')).toBe(true);
    expect(maskToRegExp('*.txt').test('notes.md')).toBe(false);
    expect(maskToRegExp('a?.txt').test('a1.txt')).toBe(true);
    expect(maskToRegExp('a?.txt').test('a12.txt')).toBe(false);
  });

  test('expands wildcards against the real file system', () => {
    const dir = tempDir({ 'a.txt': 'a', 'b.txt': 'b', 'c.md': 'c' });
    const result = expandFiles(['*.txt'], dir);

    expect(result.files.sort()).toEqual(['a.txt', 'b.txt']);
    expect(result.missing).toEqual([]);
  });

  test('reports a mask without matches as missing', () => {
    const dir = tempDir({ 'a.txt': 'a' });
    const result = expandFiles(['*.log'], dir);

    expect(result.files).toEqual([]);
    expect(result.missing).toEqual(['*.log']);
  });

  test('collects real statistics for a file', async () => {
    const dir = tempDir({ 'a.txt': 'one two\nthree\n' });
    const stats = await collectFileStats('a.txt', dir);

    expect(stats.bytes).toBe(14);
    expect(stats.lines).toBe(2);
    expect(stats.words).toBe(3);
    expect(stats.sha256).toHaveLength(16);
  });

  test('processes every file and reports progress', async () => {
    const dir = tempDir({ 'a.txt': 'a', 'b.txt': 'b' });
    const progress = [];

    const result = await processFiles({
      patterns: ['*.txt'],
      cwd: dir,
      onProgress: (done, total, file) => progress.push(`${done}/${total}:${file}`),
    });

    expect(result.processed).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.files.map((item) => item.file).sort()).toEqual(['a.txt', 'b.txt']);
    expect(progress).toEqual(['1/2:a.txt', '2/2:b.txt']);
  });

  test('counts missing files without aborting the run', async () => {
    const dir = tempDir({ 'a.txt': 'a' });
    const result = await processFiles({ patterns: ['a.txt', 'missing.txt'], cwd: dir });

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.missing).toEqual(['missing.txt']);
  });

  test('returns an empty result when no patterns are given', async () => {
    const result = await processFiles({ patterns: [] });
    expect(result).toEqual({ total: 0, processed: 0, skipped: 0, files: [], missing: [] });
  });
});
