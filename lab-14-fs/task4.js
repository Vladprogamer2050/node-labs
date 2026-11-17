'use strict';

/**
 * Lab 14 - Task 4. Stream processing of a large text file.
 *
 * 1. Generates data_7.txt with 100 000 lines: "index, random 1..1000, Вариант 7".
 * 2. Reads it with a read stream (64 KB buffer) line by line - the file is never
 *    loaded into memory as a whole.
 * 3. Computes sum, average, min, max, line count and (variant 6-10) the ten most
 *    frequent numbers, prints progress every 10% and writes processed_7.txt.
 */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const readline = require('readline');
const { once } = require('events');
const { VARIANT, WORKSPACE } = require('./config');
const { header, formatBytes, plural, ensureDir } = require('./utils');

const LINES = 100_000;
const BUFFER_SIZE = 64 * 1024; // 64 KB
const DATA_FILE = path.join(WORKSPACE, `data_${VARIANT}.txt`);
const RESULT_FILE = path.join(WORKSPACE, `processed_${VARIANT}.txt`);

/** Write the test file with backpressure handling. */
async function generateFile(filePath, lineCount) {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  for (let index = 1; index <= lineCount; index += 1) {
    const number = Math.floor(Math.random() * 1000) + 1;
    if (!stream.write(`${index}, ${number}, Вариант ${VARIANT}\n`)) {
      await once(stream, 'drain');
    }
  }

  await new Promise((resolve, reject) => {
    stream.end((error) => (error ? reject(error) : resolve()));
  });
}

/** Read the file through a stream and collect statistics. */
async function processFile(filePath, totalBytes) {
  const started = process.hrtime.bigint();
  const frequency = new Map();

  let count = 0;
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let nextProgressMark = 10;

  const stream = fs.createReadStream(filePath, {
    encoding: 'utf8',
    highWaterMark: BUFFER_SIZE,
  });
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line.trim()) continue;

    // "index, number, Вариант 7"
    const parts = line.split(',');
    const value = Number.parseInt(parts[1], 10);
    if (!Number.isFinite(value)) continue;

    count += 1;
    sum += value;
    if (value < min) min = value;
    if (value > max) max = value;
    frequency.set(value, (frequency.get(value) || 0) + 1);

    const percent = Math.floor((stream.bytesRead / totalBytes) * 100);
    if (percent >= nextProgressMark && nextProgressMark < 100) {
      console.log(`Прогресс: ${nextProgressMark}% (${count.toLocaleString('en-US')} строк обработано)`);
      nextProgressMark += 10;
    }
  }

  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  console.log(`Прогресс: 100% (${count.toLocaleString('en-US')} строк обработано)`);
  const mostFrequent = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 10)
    .map(([number, times]) => ({ number, times }));

  return {
    count,
    sum,
    average: sum / count,
    min,
    max,
    mostFrequent,
    elapsedMs,
  };
}

async function main() {
  await ensureDir(WORKSPACE);

  // 1. Generate the file only when it is missing.
  let stat = await fsp.stat(DATA_FILE).catch(() => null);
  if (!stat) {
    console.log(`Генерация файла ${path.basename(DATA_FILE)} (${LINES.toLocaleString('en-US')} строк)...`);
    await generateFile(DATA_FILE, LINES);
    stat = await fsp.stat(DATA_FILE);
  } else {
    console.log(`Файл ${path.basename(DATA_FILE)} уже существует, генерация пропущена.`);
  }

  header(`Обработка файла: ${path.basename(DATA_FILE)}`);
  console.log(`Размер файла: ${formatBytes(stat.size)}`);
  if (stat.size > 1024 * 1024) {
    console.log(`Файл больше 1 МБ -> потоковое чтение с буфером ${formatBytes(BUFFER_SIZE)}`);
  }

  // 2. Stream processing.
  const result = await processFile(DATA_FILE, stat.size);

  // 3. Write the report file.
  const reportLines = [
    `Результаты обработки файла ${path.basename(DATA_FILE)}`,
    `Всего строк: ${result.count.toLocaleString('en-US')}`,
    `Сумма чисел: ${result.sum.toLocaleString('en-US')}`,
    `Среднее значение: ${result.average.toFixed(2)}`,
    `Максимальное число: ${result.max}`,
    `Минимальное число: ${result.min}`,
    'Топ-10 самых частых чисел (вариант 6-10):',
    ...result.mostFrequent.map(
      (item, index) => `${index + 1}. ${item.number} - встретилось ${item.times} ${plural(item.times, ['раз', 'раза', 'раз'])}`
    ),
    `Время выполнения: ${(result.elapsedMs / 1000).toFixed(2)} сек`,
  ];
  await fsp.writeFile(RESULT_FILE, `${reportLines.join('\n')}\n`, 'utf8');

  header('Результаты:');
  console.log(`Всего строк: ${result.count.toLocaleString('en-US')}`);
  console.log(`Сумма чисел: ${result.sum.toLocaleString('en-US')}`);
  console.log(`Среднее значение: ${result.average.toFixed(2)}`);
  console.log(`Максимальное число: ${result.max}`);
  console.log(`Минимальное число: ${result.min}`);

  console.log('\nТоп-10 самых частых чисел:');
  result.mostFrequent.forEach((item, index) => {
    console.log(
      `  ${String(index + 1).padStart(2)}. ${String(item.number).padStart(4)} - ${item.times} ${plural(item.times, ['раз', 'раза', 'раз'])}`
    );
  });

  console.log(`\nРезультаты сохранены в: ${path.relative(process.cwd(), RESULT_FILE)}`);
  console.log(`Время выполнения: ${(result.elapsedMs / 1000).toFixed(2)} сек`);

  // Verification: the report file must exist and contain the same numbers.
  const saved = await fsp.readFile(RESULT_FILE, 'utf8');
  const ok = saved.includes(`Всего строк: ${result.count.toLocaleString('en-US')}`) && saved.includes(`Сумма чисел: ${result.sum.toLocaleString('en-US')}`);
  if (!ok) throw new Error('файл результатов не совпадает с расчётом');
  console.log('Проверка пройдена: файл результатов содержит те же значения.');
}

main().catch((error) => {
  console.error('Ошибка выполнения задания 4:', error.message);
  process.exitCode = 1;
});
