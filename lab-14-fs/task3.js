'use strict';

/**
 * Lab 14 - Task 3. Searching and filtering files.
 *
 * Scans a directory recursively (CLI argument, current directory by default)
 * and prints statistics: files, folders, total size, extensions, top-5 largest
 * and top-5 smallest files. The result is saved to report_7.json.
 *
 * Variant 7 (6-10) -> node_modules and .git are ignored.
 */
const fsp = require('fs').promises;
const path = require('path');
const { VARIANT, WORKSPACE } = require('./config');
const { header, formatBytes, plural, ensureDir, walk } = require('./utils');

const IGNORED_DIRS = ['node_modules', '.git'];
const PREVIEW_LIMIT = 8; // how many files of one type are printed to the console

function brief(file) {
  return {
    name: path.basename(file.relPath),
    size: file.size,
    sizeHuman: formatBytes(file.size),
    path: `./${file.relPath.split(path.sep).join('/')}`,
  };
}

/** Group every file by extension: { extension, count, bytes, humanSize, files[] }. */
function groupByExtension(files) {
  const map = new Map();
  for (const file of files) {
    const item = map.get(file.ext) || { extension: file.ext, count: 0, bytes: 0, files: [] };
    item.count += 1;
    item.bytes += file.size;
    item.files.push(brief(file));
    map.set(file.ext, item);
  }

  return [...map.values()]
    .map((item) => ({
      ...item,
      humanSize: formatBytes(item.bytes),
      files: item.files.sort((a, b) => a.path.localeCompare(b.path)),
    }))
    .sort((a, b) => b.bytes - a.bytes);
}

async function main() {
  const target = process.argv[2] || '.';
  const root = path.resolve(target);

  const stat = await fsp.stat(root).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`директория не найдена или не является папкой: ${target}`);
  }

  const { files, dirs } = await walk(root, { ignoreDirs: IGNORED_DIRS });
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const byExtension = groupByExtension(files);

  const bySize = [...files].sort((a, b) => b.size - a.size || a.relPath.localeCompare(b.relPath));
  const topLargest = bySize.slice(0, 5).map(brief);
  const topSmallest = [...bySize].reverse().slice(0, 5).map(brief);

  header(`Анализ директории: ${path.relative(process.cwd(), root) || '.'}`);
  console.log(`Папок: ${dirs.length}`);
  console.log(`Файлов: ${files.length}`);
  console.log(
    `Общий размер: ${formatBytes(totalBytes)} (${totalBytes.toLocaleString('en-US')} байт)`
  );
  console.log(`Игнорируются папки: ${IGNORED_DIRS.join(', ')} (вариант ${VARIANT})`);

  console.log('\nФайлы по типам:');
  for (const item of byExtension) {
    console.log(
      `  ${item.extension}: ${item.count} ${plural(item.count, ['файл', 'файла', 'файлов'])} (${item.humanSize})`
    );
    const preview = item.files.slice(0, PREVIEW_LIMIT);
    for (const file of preview) {
      console.log(`      ${file.path} (${file.sizeHuman})`);
    }
    if (item.files.length > preview.length) {
      console.log(`      ... и ещё ${item.files.length - preview.length}`);
    }
  }

  console.log('\nТоп-5 самых больших файлов:');
  topLargest.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name} (${file.sizeHuman}) - ${file.path}`);
  });

  console.log('\nТоп-5 самых маленьких файлов:');
  topSmallest.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name} (${file.sizeHuman}) - ${file.path}`);
  });

  const report = {
    generatedAt: new Date().toISOString(),
    variant: VARIANT,
    directory: root,
    ignoredDirectories: IGNORED_DIRS,
    totals: {
      directories: dirs.length,
      files: files.length,
      bytes: totalBytes,
      humanSize: formatBytes(totalBytes),
    },
    byExtension,
    top5Largest: topLargest,
    top5Smallest: topSmallest,
  };

  await ensureDir(WORKSPACE);
  const reportPath = path.join(WORKSPACE, `report_${VARIANT}.json`);
  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`\nОтчет сохранён: ${path.relative(process.cwd(), reportPath)}`);

  // Verify that the file really exists and is valid JSON.
  const saved = JSON.parse(await fsp.readFile(reportPath, 'utf8'));
  if (saved.totals.files !== files.length) throw new Error('отчёт не совпадает с результатом сканирования');
  console.log('Проверка пройдена: отчёт читается и содержит те же цифры.');
}

main().catch((error) => {
  console.error('Ошибка выполнения задания 3:', error.message);
  process.exitCode = 1;
});
