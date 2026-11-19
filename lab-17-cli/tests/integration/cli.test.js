'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const BIN = path.resolve(__dirname, '../../bin/lab17-cli.js');

function run(args, options = {}) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    cwd: options.cwd || process.cwd(),
    input: options.input,
    timeout: 60000,
    env: { ...process.env, NO_COLOR: '1', ...options.env },
  });

  return {
    code: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lab17-cli-'));
}

describe('CLI integration (child_process.spawn)', () => {
  test('--help prints the localized usage', () => {
    const result = run(['--help']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Использование: lab17-cli');
    expect(result.stdout).toContain('Команды:');
  });

  test('--version prints the package version', () => {
    const result = run(['--version']);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('1.0.0');
  });

  test('an unknown command exits with code 1', () => {
    const result = run(['nope']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('неизвестная команда "nope"');
    expect(result.stderr).toContain('Для справки используйте');
  });

  test('greet prints a greeting and exits with code 0', () => {
    const result = run(['greet', 'Иван']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Привет, Иван!');
  });

  test('info prints the group and the student', () => {
    const result = run(['info']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Группа: 478');
    expect(result.stdout).toContain('Лабораторная работа: №17');
  });

  test('generate --dry-run creates no file', () => {
    const dir = tempDir();
    const result = run(['generate', '--type', 'html', '--dry-run'], { cwd: dir });

    expect(result.code).toBe(0);
    expect(result.stderr).toContain('[DRY-RUN]');
    expect(fs.existsSync(path.join(dir, 'output.html'))).toBe(false);
  });

  test('generate rejects an unknown type with code 1', () => {
    const dir = tempDir();
    const result = run(['generate', '--type', 'docx'], { cwd: dir });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('недопустимый тип отчёта "docx"');
  });

  test('generate writes a json report', () => {
    const dir = tempDir();
    const result = run(['generate', '--type', 'json', '--output', 'report.json'], { cwd: dir });

    expect(result.code).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8')).lab).toBe(17);
  });

  test('init --no-interactive without data exits with code 1', () => {
    const dir = tempDir();
    const result = run(['init', '--no-interactive'], { cwd: dir });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('необходимо указать --name и --type');
  });

  test('init with flags creates the project without questions', () => {
    const dir = tempDir();
    const result = run(
      ['init', '--name', 'flag-app', '--type', 'cli', '--typescript', '--no-git', '--no-interactive'],
      { cwd: dir }
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toContain('успешно инициализирован');
    expect(fs.existsSync(path.join(dir, 'flag-app', 'src', 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'flag-app', 'tsconfig.json'))).toBe(true);
  });

  test('init detects data from stdin and disables the dialog', () => {
    const dir = tempDir();
    const result = run(['init', '--no-interactive'], { cwd: dir, input: 'piped-app\n' });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('недостаточно данных. Укажите --type');
  });

  test('build without config.json exits with code 1 and a hint', () => {
    const dir = tempDir();
    const result = run(['build'], { cwd: dir });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('файл конфигурации не найден');
    expect(result.stderr).toContain('Укажите путь через --config');
  });

  test('build --dry-run does not create dist/', () => {
    const dir = tempDir();
    run(['init', '--name', 'dry-app', '--type', 'cli', '--no-git', '--no-interactive'], {
      cwd: dir,
    });

    const result = run(['build', '--dir', 'dry-app', '--dry-run'], { cwd: dir });
    expect(result.code).toBe(0);
    expect(fs.existsSync(path.join(dir, 'dry-app', 'dist'))).toBe(false);
  });

  test('process --quiet writes nothing to stderr', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'a.txt'), 'alpha\nbeta\n');

    const result = run(['process', '--files', 'a.txt', '--output', 'result.json', '--quiet'], {
      cwd: dir,
    });

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8')).processed).toBe(1);
  });

  test('process reports a missing file and exits with code 1', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'a.txt'), 'alpha\n');

    const result = run(['process', '--files', 'a.txt', 'missing.txt', '--delay', '0'], { cwd: dir });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Файл missing.txt не найден');
    expect(result.stderr).toContain('Пропущено 1 файл');
  });

  test('deploy without --force and without a terminal asks for confirmation', () => {
    const dir = tempDir();
    run(['init', '--name', 'deploy-app', '--type', 'cli', '--no-git', '--no-interactive'], {
      cwd: dir,
    });

    const result = run(['deploy', '--dir', 'deploy-app', '--env', 'production'], { cwd: dir });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('требуется подтверждение развёртывания');
  });

  test('deploy --force prints the URL', () => {
    const dir = tempDir();
    run(['init', '--name', 'force-app', '--type', 'cli', '--no-git', '--no-interactive'], {
      cwd: dir,
    });

    const result = run(['deploy', '--dir', 'force-app', '--force'], { cwd: dir });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('https://force-app.example.com');
  });

  test('demo --mode silent prints nothing and exits with code 0', () => {
    const result = run(['demo', '--mode', 'silent']);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  test('unexpected errors hide the stack in production', () => {
    const production = run(['demo', '--mode', 'fail'], { env: { NODE_ENV: 'production' } });
    expect(production.code).toBe(1);
    expect(production.stderr).toContain('внутренняя ошибка');
    expect(production.stderr).not.toContain('    at ');
  });

  test('unexpected errors keep the stack in development', () => {
    const development = run(['demo', '--mode', 'fail'], { env: { NODE_ENV: 'development' } });
    expect(development.code).toBe(1);
    expect(development.stderr).toContain('    at ');
  });
});
