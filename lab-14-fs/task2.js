'use strict';

/**
 * Lab 14 - Task 2. Working with directories.
 *
 * Builds project_7/, fills every folder with info.txt, prints the tree,
 * then moves temp into data, renames data/output to data/results, removes
 * the moved temp folder and prints the updated tree.
 *
 * Variant 7 is odd -> src/components gets three extra folders 1, 2, 3.
 */
const fsp = require('fs').promises;
const path = require('path');
const { VARIANT, WORKSPACE } = require('./config');
const { header, ensureDir, removeDir, printTree } = require('./utils');

const PROJECT_DIR = path.join(WORKSPACE, `project_${VARIANT}`);

/** Folder layout with a description for every info.txt. */
const STRUCTURE = [
  ['src', 'Исходный код проекта'],
  [path.join('src', 'modules'), 'Переиспользуемые модули приложения'],
  [path.join('src', 'components'), 'Компоненты интерфейса'],
  [path.join('src', 'utils'), 'Вспомогательные утилиты'],
  ['data', 'Данные проекта'],
  [path.join('data', 'input'), 'Входные данные для обработки'],
  [path.join('data', 'output'), 'Результаты обработки'],
  ['temp', 'Временные файлы'],
];

async function createStructure() {
  for (const [relative, description] of STRUCTURE) {
    const dir = path.join(PROJECT_DIR, relative);
    await ensureDir(dir);
    // info.txt explains the purpose of the folder
    await fsp.writeFile(
      path.join(dir, 'info.txt'),
      `${relative}\n${description}\n`,
      'utf8'
    );
  }

  // Odd variant: three extra folders inside src/components.
  if (VARIANT % 2 !== 0) {
    for (const number of [1, 2, 3]) {
      await ensureDir(path.join(PROJECT_DIR, 'src', 'components', String(number)));
    }
    console.log('Вариант нечётный: в src/components созданы папки 1, 2, 3');
  }
}

async function main() {
  await ensureDir(WORKSPACE);
  await removeDir(PROJECT_DIR); // start from a clean state on every run

  // 1-2. Create the structure and the info.txt files.
  await createStructure();

  // 3. Print the created tree.
  header(`Созданная структура: ${path.join(`project_${VARIANT}`)}`);
  await printTree(PROJECT_DIR);

  // 4. Move temp inside data.
  const tempDir = path.join(PROJECT_DIR, 'temp');
  const movedTemp = path.join(PROJECT_DIR, 'data', 'temp');
  await fsp.rename(tempDir, movedTemp);
  console.log('\nПеремещено: temp -> data/temp');

  // 5. Rename data/output to data/results.
  await fsp.rename(
    path.join(PROJECT_DIR, 'data', 'output'),
    path.join(PROJECT_DIR, 'data', 'results')
  );
  console.log('Переименовано: data/output -> data/results');

  // 6. Remove the moved temp folder with all its content.
  await removeDir(movedTemp);
  console.log('Удалено: data/temp (со всем содержимым)');

  // 7. Print the updated tree.
  header('Обновлённая структура:');
  await printTree(PROJECT_DIR);

  // Verify the result instead of trusting the log above.
  const remaining = await fsp.readdir(PROJECT_DIR);
  const dataEntries = await fsp.readdir(path.join(PROJECT_DIR, 'data'));
  console.log(`\nПапки верхнего уровня: ${remaining.join(', ')}`);
  console.log(`Содержимое data: ${dataEntries.join(', ')}`);

  const ok =
    !remaining.includes('temp') &&
    dataEntries.includes('results') &&
    !dataEntries.includes('output') &&
    !dataEntries.includes('temp');
  if (!ok) throw new Error('итоговая структура не совпадает с ожидаемой');
  console.log('Проверка пройдена: temp перенесён и удалён, output переименован в results.');
}

main().catch((error) => {
  console.error('Ошибка выполнения задания 2:', error.message);
  process.exitCode = 1;
});
