'use strict';

/**
 * Lab 14 - Task 5. Copying and synchronisation with streams.
 *
 * 1. Creates source_7/ with 20 files of different types and sizes, three
 *    subfolders and manifest.json.
 * 2. Copies everything to backup_7/ keeping the folder structure:
 *      - .txt / .js / .json  -> stream copy
 *      - .jpg / .png / .gif  -> plain copy
 *      - files > 1 MB        -> split into 512 KB chunks
 * 3. Compares source_7 and backup_7, writes sync_report_7.txt.
 *
 * Variant 7 (6-10) -> MD5 checksums are compared for files larger than 500 KB.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { VARIANT, WORKSPACE } = require('./config');
const { header, formatBytes, plural, ensureDir, removeDir, walk } = require('./utils');

const SOURCE_DIR = path.join(WORKSPACE, `source_${VARIANT}`);
const BACKUP_DIR = path.join(WORKSPACE, `backup_${VARIANT}`);
const REPORT_FILE = path.join(WORKSPACE, `sync_report_${VARIANT}.txt`);
const CHUNK_SIZE = 512 * 1024; // 512 KB
const BIG_FILE = 1024 * 1024; // 1 MB
const CHECKSUM_LIMIT = 500 * 1024; // variant 6-10: MD5 for files > 500 KB
const STREAM_EXTENSIONS = new Set(['.txt', '.js', '.json']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.png', '.gif']);

/** Test file layout: [relative path, size in bytes]. */
const LAYOUT = [
  ['readme.md', 1_200],
  ['notes.txt', 2_500_000],
  ['app.js', 180_000],
  ['config.json', 2_048],
  ['photo_1.png', 1_400_000],
  ['photo_2.jpg', 620_000],
  ['icon.gif', 45_000],
  ['styles.css', 12_000],
  ['index.html', 8_000],
  ['data.csv', 95_000],
  ['app.log', 150_000],
  ['worker.js', 60_000],
  ['notes_2.txt', 15_000],
  ['settings.json', 3_000],
  ['banner.png', 30_000],
  ['cover.jpg', 250_000],
  ['anim.gif', 18_000],
  ['report.md', 5_000],
  ['todo.txt', 900],
  ['matrix.txt', 4_000],
  [path.join('src', 'main.js'), 75_000],
  [path.join('src', 'utils.js'), 22_000],
  [path.join('src', 'style.css'), 6_000],
  [path.join('data', 'values.json'), 40_000],
  [path.join('data', 'values.csv'), 110_000],
  [path.join('media', 'big.png'), 1_200_000],
  [path.join('media', 'small.jpg'), 80_000],
  [path.join('media', 'clip.gif'), 25_000],
];

const MAGIC = {
  '.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  '.gif': Buffer.from('GIF89a', 'ascii'),
};

/** Deterministic pseudo random bytes so two runs produce the same sources. */
function makeContent(relative, size) {
  const ext = path.extname(relative).toLowerCase();
  const seed = crypto.createHash('sha256').update(relative).digest();
  const buffer = Buffer.alloc(size);

  for (let index = 0; index < size; index += 1) {
    buffer[index] = seed[index % seed.length] ^ (index % 251);
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    // Synthetic test binaries: real signature, random payload.
    MAGIC[ext].copy(buffer, 0);
  } else {
    // Text files: readable lines so the sizes look natural.
    const line = `[${relative}] test payload line ${'x'.repeat(40)}\n`;
    const encoded = Buffer.from(line, 'utf8');
    for (let offset = 0; offset + encoded.length <= size; offset += encoded.length) {
      encoded.copy(buffer, offset);
    }
  }

  return buffer;
}

async function createTestStructure() {
  await removeDir(SOURCE_DIR);
  await ensureDir(SOURCE_DIR);

  const manifest = [];
  for (const [relative, size] of LAYOUT) {
    const absPath = path.join(SOURCE_DIR, relative);
    await ensureDir(path.dirname(absPath));
    await fsp.writeFile(absPath, makeContent(relative, size));

    const ext = path.extname(relative).toLowerCase();
    const kind = IMAGE_EXTENSIONS.has(ext)
      ? 'image'
      : STREAM_EXTENSIONS.has(ext)
        ? 'text-stream'
        : 'other';

    manifest.push({
      path: relative.split(path.sep).join('/'),
      size,
      sizeHuman: formatBytes(size),
      extension: ext,
      kind,
      copyMode: size > BIG_FILE ? 'chunked' : kind === 'text-stream' ? 'stream' : 'copy',
    });
  }

  const manifestPath = path.join(SOURCE_DIR, 'manifest.json');
  await fsp.writeFile(manifestPath, `${JSON.stringify({ variant: VARIANT, files: manifest }, null, 2)}\n`, 'utf8');

  // Describe the manifest itself as well, then rewrite it with the real size.
  const manifestSize = (await fsp.stat(manifestPath)).size;
  manifest.push({
    path: 'manifest.json',
    size: manifestSize,
    sizeHuman: formatBytes(manifestSize),
    extension: '.json',
    kind: 'text-stream',
    copyMode: 'stream',
    self: true,
  });
  await fsp.writeFile(manifestPath, `${JSON.stringify({ variant: VARIANT, files: manifest }, null, 2)}\n`, 'utf8');

  console.log(`Создана тестовая структура: ${path.relative(process.cwd(), SOURCE_DIR)}`);
  console.log(`Файлов: ${manifest.length}, папок: 3 (src, data, media), manifest.json создан`);
  return manifest;
}

/** Stream copy for text files. */
async function copyAsStream(from, to) {
  await ensureDir(path.dirname(to));
  await pipeline(fs.createReadStream(from), fs.createWriteStream(to));
}

/** Plain copy for images and other binary files. */
async function copyAsFile(from, to) {
  await ensureDir(path.dirname(to));
  await fsp.copyFile(from, to);
}

/** Split a big file into 512 KB parts, each part is written through a stream. */
async function copyInChunks(from, to, size) {
  await ensureDir(path.dirname(to));
  const parts = Math.ceil(size / CHUNK_SIZE);
  for (let index = 0; index < parts; index += 1) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, size) - 1;
    await pipeline(
      fs.createReadStream(from, { start, end }),
      fs.createWriteStream(`${to}.part${index + 1}`)
    );
  }
  return parts;
}

/** MD5 of a whole file (stream based, never loads the file into memory). */
async function md5OfFile(filePath) {
  const hash = crypto.createHash('md5');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

/** MD5 of a logical file that may consist of several .partN chunks. */
async function md5OfParts(parts) {
  const hash = crypto.createHash('md5');
  for (const part of parts) {
    for await (const chunk of fs.createReadStream(part)) hash.update(chunk);
  }
  return hash.digest('hex');
}

async function copyAll(manifest) {
  await removeDir(BACKUP_DIR);
  await ensureDir(BACKUP_DIR);

  const stats = { stream: 0, copy: 0, chunked: 0, bytes: 0, parts: 0 };
  const started = process.hrtime.bigint();
  let index = 0;

  for (const item of manifest) {
    const from = path.join(SOURCE_DIR, item.path);
    const to = path.join(BACKUP_DIR, item.path);
    index += 1;

    let mode = item.copyMode;
    let note = '';
    try {
      if (item.size > BIG_FILE) {
        const parts = await copyInChunks(from, to, item.size);
        stats.chunked += 1;
        stats.parts += parts;
        note = `chunked: ${parts} x 512 KB`;
      } else if (item.kind === 'text-stream') {
        await copyAsStream(from, to);
        stats.stream += 1;
        note = 'stream';
      } else {
        await copyAsFile(from, to);
        stats.copy += 1;
        note = IMAGE_EXTENSIONS.has(item.extension) ? 'plain copy (image)' : 'plain copy';
      }
    } catch (error) {
      throw new Error(`не удалось скопировать ${item.path}: ${error.message}`);
    }
    mode = note;
    stats.bytes += item.size;

    console.log(
      `[${String(index).padStart(2)}/${manifest.length}] ${item.path.padEnd(26)} ` +
        `${formatBytes(item.size).padStart(9)} - ${mode}`
    );
  }

  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  return { ...stats, elapsedMs };
}

/**
 * Build a map "relative path -> logical file" for a directory.
 * Parts named file.part1..N are merged into one logical file.
 */
async function collectLogicalFiles(root) {
  const { files } = await walk(root);
  const map = new Map();

  for (const file of files) {
    const match = file.relPath.match(/^(.*)\.part(\d+)$/);
    if (match) {
      const base = match[1];
      const entry = map.get(base) || { parts: [], size: 0, mtimeMs: 0 };
      entry.parts.push(file.absPath);
      entry.size += file.size;
      map.set(base, entry);
    } else {
      map.set(file.relPath, { parts: [file.absPath], size: file.size, mtimeMs: file.mtimeMs });
    }
  }

  // Keep the parts in numeric order so the checksum matches the source file.
  for (const entry of map.values()) {
    entry.parts.sort((a, b) => {
      const na = Number(a.match(/\.part(\d+)$/)?.[1] || 0);
      const nb = Number(b.match(/\.part(\d+)$/)?.[1] || 0);
      return na - nb;
    });
  }
  return map;
}

/** Compare source and backup; MD5 is used for files > 500 KB (variant 6-10). */
async function compareDirectories() {
  const source = await collectLogicalFiles(SOURCE_DIR);
  const backup = await collectLogicalFiles(BACKUP_DIR);

  const added = [];
  const deleted = [];
  const changed = [];
  const same = [];
  const checksumChecked = [];

  for (const [relative, sourceFile] of source) {
    const backupFile = backup.get(relative);
    if (!backupFile) {
      added.push(relative);
      continue;
    }

    if (sourceFile.size !== backupFile.size) {
      changed.push({ path: relative, reason: `size ${sourceFile.size} -> ${backupFile.size}` });
      continue;
    }

    if (sourceFile.size > CHECKSUM_LIMIT) {
      const [sourceHash, backupHash] = await Promise.all([
        md5OfFile(sourceFile.parts[0]),
        md5OfParts(backupFile.parts),
      ]);
      checksumChecked.push({ path: relative, md5: sourceHash });
      if (sourceHash !== backupHash) {
        changed.push({ path: relative, reason: `md5 ${sourceHash.slice(0, 8)} -> ${backupHash.slice(0, 8)}` });
        continue;
      }
    }

    same.push(relative);
  }

  for (const relative of backup.keys()) {
    if (!source.has(relative)) deleted.push(relative);
  }

  return { added, deleted, changed, same, checksumChecked };
}

/** Change one source file, add one file and delete one source file so the diff is visible. */
async function demonstrateChanges() {
  const edited = path.join(SOURCE_DIR, 'todo.txt');
  await fsp.appendFile(edited, 'new line added after the backup\n', 'utf8');

  const addedFile = path.join(SOURCE_DIR, `new_file_${VARIANT}.txt`);
  await fsp.writeFile(addedFile, `Файл добавлен после копирования. Вариант ${VARIANT}.\n`, 'utf8');

  // Removed from the source after the copy -> must be reported as "deleted".
  await fsp.rm(path.join(SOURCE_DIR, 'icon.gif'));
  return { edited: 'todo.txt', added: `new_file_${VARIANT}.txt`, removedFromSource: 'icon.gif' };
}

function listSection(title, items, mapper = (item) => item) {
  const lines = [`${title}: ${items.length}`];
  if (items.length === 0) lines.push('  (нет)');
  items.forEach((item) => lines.push(`  - ${mapper(item)}`));
  return lines;
}

async function main() {
  await ensureDir(WORKSPACE);

  // 1. Test structure.
  const manifest = await createTestStructure();

  // 2. Copy with filtering.
  header('Копирование source_7 -> backup_7');
  const stats = await copyAll(manifest);
  console.log('\nКопирование завершено.');
  console.log(`Потоковое копирование: ${stats.stream} файлов`);
  console.log(`Обычное копирование: ${stats.copy} файлов`);
  console.log(`Разбито на чанки: ${stats.chunked} файлов (${stats.parts} частей по 512 КБ)`);
  console.log(`Общий размер: ${formatBytes(stats.bytes)}`);
  console.log(`Время выполнения: ${(stats.elapsedMs / 1000).toFixed(2)} сек`);

  // 3. Sync: compare, then demonstrate the diff detection.
  const demo = await demonstrateChanges();
  header('Сравнение директорий');
  console.log(`Демонстрация: изменён source/${demo.edited}, добавлен source/${demo.added}, удалён source/${demo.removedFromSource}`);

  const diff = await compareDirectories();

  const filesWord = (count) => plural(count, ['файл', 'файла', 'файлов']);
  console.log(`Совпадают: ${diff.same.length} ${filesWord(diff.same.length)}`);
  console.log(`Изменены: ${diff.changed.length} ${filesWord(diff.changed.length)}`);
  console.log(`Добавлены: ${diff.added.length} ${filesWord(diff.added.length)}`);
  console.log(`Удалены: ${diff.deleted.length} ${filesWord(diff.deleted.length)}`);
  console.log(`MD5 проверено для файлов > 500 КБ: ${diff.checksumChecked.length}`);

  const reportLines = [
    `Отчёт синхронизации source_${VARIANT} <-> backup_${VARIANT}`,
    `Дата: ${new Date().toISOString()}`,
    `Вариант: ${VARIANT} (6-10: MD5 для файлов > 500 КБ)`,
    '',
    `Совпадают: ${diff.same.length}`,
    `Изменены: ${diff.changed.length}`,
    ...diff.changed.map((item) => `  - ${item.path} (${item.reason})`),
    `Добавлены: ${diff.added.length}`,
    ...diff.added.map((item) => `  - ${item}`),
    `Удалены: ${diff.deleted.length}`,
    ...diff.deleted.map((item) => `  - ${item}`),
    '',
    `MD5 проверено для файлов > 500 КБ: ${diff.checksumChecked.length}`,
    ...diff.checksumChecked.map((item) => `  - ${item.path}: ${item.md5}`),
  ];

  await fsp.writeFile(REPORT_FILE, `${reportLines.join('\n')}\n`, 'utf8');
  console.log(`\nОтчет сохранён: ${path.relative(process.cwd(), REPORT_FILE)}`);

  // Verification of the reported result.
  const backupFiles = await collectLogicalFiles(BACKUP_DIR);
  const sourceFiles = await collectLogicalFiles(SOURCE_DIR);
  const diffIsExpected =
    diff.added.length === 1 &&
    diff.added[0] === demo.added &&
    diff.deleted.length === 1 &&
    diff.deleted[0] === demo.removedFromSource &&
    diff.changed.length === 1 &&
    diff.changed[0].path === demo.edited;
  if (!diffIsExpected) {
    throw new Error(
      `результат сравнения не совпадает с ожидаемым: ${JSON.stringify({
        added: diff.added,
        deleted: diff.deleted,
        changed: diff.changed.map((item) => item.path),
      })}`
    );
  }
  if (backupFiles.size !== sourceFiles.size) {
    throw new Error(`разное число файлов: source ${sourceFiles.size}, backup ${backupFiles.size}`);
  }
  console.log('Проверка пройдена: 1 добавлен, 1 удалён, 1 изменён.');
}

main().catch((error) => {
  console.error('Ошибка выполнения задания 5:', error.message);
  process.exitCode = 1;
});
