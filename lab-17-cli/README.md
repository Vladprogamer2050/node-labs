# Lab 17 — CLI applications

**Student:** Evdokimov Vladislav Evgenievich (Евдокимов Владислав Евгеньевич)
**Group:** 478
**Journal number (variant):** 7

A CLI application built in five levels: positional arguments, `commander`
options, an `inquirer` dialog, formatted output with `chalk`/`ora`/`cli-progress`
and a full project architecture with tests and an autonomous binary.

## Commands

| Command | What it does |
|---|---|
| `lab17-cli` | prints the help when called without arguments |
| `lab17-cli greet <name>` | greeting, exit code 0 |
| `lab17-cli info` | group, student, lab number and current date |
| `lab17-cli generate` | generates a report (`html`, `pdf`, `json`, `csv`) |
| `lab17-cli convert <file> --to <format>` | converts a text file |
| `lab17-cli init` | interactive or flag-driven project initialization |
| `lab17-cli build` | bundles the project into `dist/<name>.js` |
| `lab17-cli test` | runs `npm test` in the project and prints the summary |
| `lab17-cli deploy` | simulated deployment with confirmation |
| `lab17-cli process --files <files...>` | processes files, JSON to stdout |
| `lab17-cli demo --mode <mode>` | colors, spinner, progress bar, streams, errors |

## Architecture

```
lab-17-cli/
├── bin/lab17-cli.js      # shebang, commander wiring, global error handlers
├── commands/             # one file per subcommand (init, build, deploy, ...)
├── services/             # business logic, isolated from the interface
│   ├── report-service.js
│   ├── process-service.js
│   ├── project-service.js
│   ├── deploy-service.js
│   └── config-service.js
├── utils/                # logger, spinner, progress bar, formatting, stdin
├── tests/                # unit tests (services) and integration tests (spawn)
├── config.js             # student data, project types and options
└── package.json          # bin map, scripts, jest and pkg configuration
```

`commander` stays thin: it only maps flags to an options object, every command
delegates to a service. Services never call `process.exit`, so they are covered
by unit tests directly.

## Task 1 — positional arguments and exit codes

```
$ lab17-cli
Использование: lab17-cli [options] [command]
...
$ lab17-cli greet "Владислав"
Привет, Владислав! Добро пожаловать в CLI-приложение группы 478.
$ lab17-cli info
Группа: 478
Студент: Евдокимов Владислав Евгеньевич
Лабораторная работа: №17
...
$ lab17-cli unknown
✖ Ошибка: неизвестная команда "unknown"
  Для справки используйте: lab17-cli --help
$ echo %ERRORLEVEL%
1
```

## Task 2 — options and flags (commander)

Every subcommand has its own options with short and long forms, defaults,
boolean flags and auto-generated `--help`:

```
$ lab17-cli generate --help
Использование: lab17-cli generate [options]

Опции:
  -t, --type <type>    тип отчёта: html, pdf, json, csv (по умолчанию: "html")
  -o, --output <path>  путь для сохранения
  -f, --force          перезаписать существующий файл
  --dry-run            показать что будет сделано без выполнения
  -h, --help           показать справку
```

`--version` prints the package version. An unknown report type is a validation
error with exit code 1. The PDF is generated without third-party libraries: the
service writes a minimal but valid PDF 1.4 document.

## Task 3 — interactive mode (inquirer)

`init` asks questions only when the value was not passed as a flag, and supports
all five question types: `input` (name), `list` (project type), `checkbox`
(tooling), `confirm` (Git) and `password` (access token).

```
$ lab17-cli init
? Введите название проекта: my-project
? Выберите тип проекта: CLI-утилита
? Выберите дополнительные опции: TypeScript, Prettier
? Использовать Git? Да
? Введите токен доступа: ********
✔ Проект "my-project" успешно инициализирован!
```

Non-interactive modes:

* `--no-interactive` — questions are disabled (for CI/CD);
* when stdin is a pipe, interactivity is disabled automatically and the first
  line is used as the project name;
* in non-interactive mode without `--name`/`--type` the command fails with exit
  code 1 and a hint.

The command creates a real project: `package.json`, `config.json`, `src/`,
`test/`, `README.md`, `.gitignore`, optional `tsconfig.json`/`.eslintrc.json`/
`.prettierrc` and `git init`.

## Task 4 — formatted output

* `chalk`: success is green, warnings yellow, errors red, information blue;
  colors are disabled automatically when stderr is not a terminal.
* `ora`: a spinner for long operations, a green check on success and a red cross
  on failure; disabled in CI and when the output is redirected.
* `cli-progress`: a progress bar with percentage, current/total and ETA for
  iterative processing.
* Stream separation: data goes to **stdout**, logs and errors to **stderr**, so
  `> file.json` keeps the file clean and the user still sees the log.
* Silence is Golden: `process --quiet --output result.json` prints nothing at
  all and reports success only through the exit code.

```
$ lab17-cli process --files *.txt
[██████████░░░░░░░░░░] 50% | 5/10 | ETA: 00:01
✖ Файл missing.txt не найден
⚠ Пропущено 1 файл(ов)
$ echo %ERRORLEVEL%
1
```

## Task 5 — architecture, errors, packaging, tests

* `bin/` — entry point with the shebang; `commands/`, `services/`, `utils/` —
  separation of the interface, the business logic and the output helpers.
* `uncaughtException` and `unhandledRejection` are handled in the entry point:
  the user sees a readable message, not a raw stack trace. `NODE_ENV=production`
  prints a short message, `development` adds the stack.
* `bin` map in `package.json`, local installation with `npm link`, autonomous
  binary with `pkg`:

```bash
npm link                       # lab17-cli is available in PATH
npm run build:binary           # -> bin/lab17-cli.exe
./bin/lab17-cli.exe --version  # works without Node.js installed
```

* Tests: Jest unit tests for the services (no I/O side effects) and integration
  tests through `child_process.spawn` that check `--help`, `--version`, exit
  codes and that `build --dry-run` changes no files.

```bash
npm test
# Test Suites: 5 passed, 5 total
# Tests:       53 passed, 53 total
```

### Deploy

Deployment is **simulated**: the command reads the real `package.json`, asks for
confirmation unless `--force` is passed, shows a spinner and prints the target
URL. No files are uploaded to a real server — the CLI says so explicitly.

## Run

```bash
cd lab-17-cli
npm install
node bin/lab17-cli.js --help

npm link
lab17-cli --help
```
