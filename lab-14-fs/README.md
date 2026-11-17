# Lab 14 — Working with the file system (`fs`)

**Student:** Evdokimov Vladislav Evgenievich (Евдокимов Владислав Евгеньевич)
**Group:** 478
**Journal number (variant):** 7

## Common requirements and how they are met

| Requirement (from the assignment) | Implementation |
|---|---|
| Only asynchronous methods with `async/await` (`fs.promises`) | every task uses `fs.promises` through `async` functions |
| `path` module for all path operations | `path.join`, `path.dirname`, `path.extname`, `path.resolve`, `path.relative` |
| Handle every possible error | each `main()` ends with `.catch(...)`, unreadable folders are skipped in `walk()`, every result is verified before it is printed as "Проверка пройдена" |
| Streams for files > 1 MB | `task4` reads `data_7.txt` (2.74 MB) with a 64 KB read stream; `task5` splits files > 1 MB into 512 KB chunks |
| All paths relative to the current directory | `WORKSPACE = path.join('lab-14-fs', 'workspace')` in `config.js` |
| Well-commented code | JSDoc-style comments in every module |

## Layout

```
lab-14-fs/
├── config.js     # variant, student data, workspace path
├── utils.js      # header, formatBytes, plural, ensureDir, removeDir, walk, printTree
├── task1.js      # task 1 — creating and reading files
├── task2.js      # task 2 — directories
├── task3.js      # task 3 — search and filtering
├── task4.js      # task 4 — stream processing
├── task5.js      # task 5 — copy and synchronisation
└── workspace/    # all generated artefacts (not committed, see .gitignore)
```

## Run

```bash
npm run lab14:task1
npm run lab14:task2
npm run lab14:task3            # optional argument: directory to scan
npm run lab14:task4
npm run lab14:task5
```

Run the commands from the repository root: all paths are relative to the current
directory, so `lab-14-fs/workspace` is always created next to the scripts.

## Task 1 — creating and reading files

Creates `workspace/student_7.txt` with the student name, group, variant, current
date/time and five favourite books (one per line), then appends the record count
and reads the file back in a formatted form.

```
Создан файл: student_7.txt
Добавлена строка: Количество записей: 10
...
Количество записей: 10
Размер файла: 376 байт, строк на диске: 11
Проверка пройдена: счётчик строк совпадает с файлом.
```

The number of records is **10** because the block itself occupies ten lines
(4 header lines + `Любимые книги:` + 5 books).  The script re-reads the file
and compares the counter with the real number of lines, so the value is not
hardcoded.

## Task 2 — directories

Builds `workspace/project_7/` (`src/{modules,components,utils}`, `data/{input,output}`, `temp`),
writes `info.txt` with a description into every folder, prints the tree, moves
`temp` into `data`, renames `data/output` to `data/results`, deletes the moved
`temp` and prints the updated tree.

Variant 7 is odd, therefore three extra folders `1`, `2`, `3` are created inside
`src/components`.

## Task 3 — search and filtering

Scans the directory passed as the first CLI argument (current directory by
default) recursively and prints:

* number of folders and files, total size in bytes / KB / MB;
* every file grouped by extension (count, size and the file list, 8 per type in
  the console, the full list in the JSON report);
* top-5 largest and top-5 smallest files.

The result is written to `workspace/report_7.json`.

Variant 7 (6–10): the folders `node_modules` and `.git` are skipped.

```
Папок: 13
Файлов: 21
Общий размер: 53.86 KB (55,157 байт)
Игнорируются папки: node_modules, .git (вариант 7)
```

## Task 4 — stream processing

1. Generates `workspace/data_7.txt` with 100 000 lines
   `номер строки, случайное число 1..1000, Вариант 7` (only if the file is missing).
2. Reads it through `fs.createReadStream` with a 64 KB buffer and `readline`,
   so the file is never loaded into memory as a whole.
3. Computes the sum, average, min, max and line count, prints progress every
   10 %, writes `workspace/processed_7.txt`.
4. Variant 7 (6–10): additionally finds the ten most frequent numbers.

```
Размер файла: 2.74 MB
Файл больше 1 МБ -> потоковое чтение с буфером 64.00 KB
Прогресс: 10% (9,442 строк обработано)
...
Всего строк: 100,000
Сумма чисел: 49,958,965
Среднее значение: 499.59
```

The random numbers are generated once and then reused: `data_7.txt` is created only
when it is missing, so a second run processes exactly the same file.

## Task 5 — copying and synchronisation

1. Creates `workspace/source_7/`: 20 files in the root, three subfolders
   (`src`, `data`, `media`) with files and `manifest.json` describing every file
   (29 files in total).
2. Copies everything to `workspace/backup_7/` keeping the folder structure:
   * `.txt`, `.js`, `.json` — stream copy (`stream.pipeline`);
   * `.jpg`, `.png`, `.gif` — plain copy (`fs.promises.copyFile`);
   * files > 1 MB — split into 512 KB chunks (`*.part1`, `*.part2`, …).
3. Compares `source_7` and `backup_7`: detects added, deleted and changed files
   and writes `workspace/sync_report_7.txt`.

Variant 7 (6–10): MD5 checksums are computed for every file larger than 500 KB;
chunked files are hashed over all their parts, so a chunked copy is still
verified byte by byte.

The comparison is demonstrated on purpose: `todo.txt` is modified, `new_file_7.txt`
is added and `icon.gif` is deleted after the copy.

```
Потоковое копирование: 11 файлов
Обычное копирование: 15 файлов
Разбито на чанки: 3 файлов (11 частей по 512 КБ)
Общий размер: 6.64 MB
...
Совпадают: 27 файлов
Изменены: 1 файл
Добавлены: 1 файл
Удалены: 1 файл
MD5 проверено для файлов > 500 КБ: 4
Проверка пройдена: 1 добавлен, 1 удалён, 1 изменён.
```

## Note

Everything under `lab-14-fs/workspace/` is generated by the scripts. It is
listed in `.gitignore` and recreated on every run, so the repository contains
only the source code.
