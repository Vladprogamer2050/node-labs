'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  validateProjectName,
  initProject,
  buildProject,
  parseTestSummary,
} = require('../../services/project-service');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lab17-project-'));
}

describe('project service', () => {
  test('parses a TAP summary from node --test', () => {
    const summary = parseTestSummary('# tests 4\n# pass 4\n# fail 0\n');
    expect(summary).toEqual({ parsed: true, passed: 4, failed: 0, total: 4 });
  });

  test('parses the Node 24 spec reporter summary', () => {
    const summary = parseTestSummary('ℹ tests 4\nℹ pass 4\nℹ fail 0\n');
    expect(summary).toEqual({ parsed: true, passed: 4, failed: 0, total: 4 });
  });

  test('parses a Jest summary', () => {
    const summary = parseTestSummary('Tests:       2 failed, 3 passed, 5 total\n');
    expect(summary).toEqual({ parsed: true, passed: 3, failed: 2, total: 5 });
  });

  test('returns parsed=false for unknown output', () => {
    expect(parseTestSummary('something went wrong').parsed).toBe(false);
  });

  test('rejects an invalid project name', () => {
    expect(() => validateProjectName('bad name!')).toThrow(/недопустимое название/);
    expect(() => validateProjectName('')).toThrow(/не указано название/);
  });

  test('creates a project skeleton with optional tooling', () => {
    const dir = tempDir();
    const result = initProject({
      name: 'demo-app',
      type: 'cli',
      options: ['typescript', 'prettier'],
      git: false,
      baseDir: dir,
    });

    expect(fs.existsSync(path.join(result.dir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(result.dir, 'src/index.js'))).toBe(true);
    expect(fs.existsSync(path.join(result.dir, 'test/app.test.js'))).toBe(true);
    expect(fs.existsSync(path.join(result.dir, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(result.dir, '.prettierrc'))).toBe(true);
    expect(fs.existsSync(path.join(result.dir, '.git'))).toBe(false);

    const pkg = JSON.parse(fs.readFileSync(path.join(result.dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('demo-app');
    expect(pkg.scripts.test).toBe('node --test');
  });

  test('refuses to overwrite a non-empty directory', () => {
    const dir = tempDir();
    initProject({ name: 'taken', type: 'cli', baseDir: dir });
    expect(() => initProject({ name: 'taken', type: 'cli', baseDir: dir })).toThrow(
      /уже существует/
    );
  });

  test('builds a runnable bundle', () => {
    const dir = tempDir();
    const project = initProject({ name: 'bundle-app', type: 'cli', baseDir: dir });

    const result = buildProject({ baseDir: project.dir });
    const bundlePath = path.join(project.dir, result.output);

    expect(result.output).toBe('dist/bundle-app.js');
    expect(fs.existsSync(bundlePath)).toBe(true);
    expect(fs.readFileSync(bundlePath, 'utf8')).toContain('Hello from');
  });

  test('build --dry-run does not create files', () => {
    const dir = tempDir();
    const project = initProject({ name: 'dry-app', type: 'cli', baseDir: dir });

    const result = buildProject({ baseDir: project.dir, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.sources.length).toBe(2);
    expect(fs.existsSync(path.join(project.dir, 'dist'))).toBe(false);
  });

  test('explains a missing config.json', () => {
    const dir = tempDir();
    initProject({ name: 'no-config', type: 'cli', baseDir: dir });
    fs.unlinkSync(path.join(dir, 'no-config', 'config.json'));

    expect(() => buildProject({ baseDir: path.join(dir, 'no-config') })).toThrow(
      /файл конфигурации не найден/
    );
  });
});
