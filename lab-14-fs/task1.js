'use strict';

/**
 * Lab 14 - Task 1. Creating and reading files.
 *
 * Creates student_7.txt, writes the student block, appends the line counter,
 * then reads the file back and prints it in a formatted way.
 */
const fsp = require('fs').promises;
const path = require('path');
const { VARIANT, STUDENT, FAVORITE_BOOKS, WORKSPACE } = require('./config');
const { header, ensureDir } = require('./utils');

/** Local date in "YYYY-MM-DD HH:MM:SS" format. */
function currentTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

async function main() {
  const fileName = `student_${VARIANT}.txt`;
  const filePath = path.join(WORKSPACE, fileName);

  await ensureDir(WORKSPACE);

  // 1-2. Build the content block (one record per line).
  const lines = [
    `Студент: ${STUDENT.fullNameRu}`,
    `Группа: ${STUDENT.group}`,
    `Вариант: ${VARIANT}`,
    `Дата: ${currentTimestamp()}`,
    'Любимые книги:',
    ...FAVORITE_BOOKS.map((book, index) => `${index + 1}. ${book}`),
  ];

  await fsp.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Создан файл: ${fileName}`);

  // 3. Append the record counter: the number of lines already in the file.
  const recordCount = lines.length;
  await fsp.appendFile(filePath, `Количество записей: ${recordCount}\n`, 'utf8');
  console.log(`Добавлена строка: Количество записей: ${recordCount}`);

  // 4. Read the file back and print it.
  const content = await fsp.readFile(filePath, 'utf8');
  const separator = '─'.repeat(50);

  header('Содержимое файла:');
  console.log(separator);
  process.stdout.write(content.endsWith('\n') ? content : `${content}\n`);
  console.log(separator);

  // Extra sanity check: real line count on disk versus the counter.
  const stat = await fsp.stat(filePath);
  const diskLines = content.split('\n').filter((line) => line.length > 0).length;
  console.log(`Размер файла: ${stat.size} байт, строк на диске: ${diskLines}`);

  if (diskLines !== recordCount + 1) {
    throw new Error(
      `line counter mismatch: expected ${recordCount + 1} lines, got ${diskLines}`
    );
  }
  console.log('Проверка пройдена: счётчик строк совпадает с файлом.');
}

main().catch((error) => {
  console.error('Ошибка выполнения задания 1:', error.message);
  process.exitCode = 1;
});
