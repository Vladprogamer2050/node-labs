'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CliError } = require('../../utils/errors');
const { readConfig, readProjectPackage } = require('../../services/config-service');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lab17-config-'));
}

describe('config service', () => {
  test('reads a valid config', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'config.json'), '{"name":"demo","entry":"src/index.js"}');

    expect(readConfig('config.json', dir)).toEqual({ name: 'demo', entry: 'src/index.js' });
  });

  test('throws a CliError with a hint for a missing file', () => {
    const dir = tempDir();

    expect.assertions(4);
    try {
      readConfig('config.json', dir);
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect(error.message).toContain('файл конфигурации не найден');
      expect(error.hint).toBe('Укажите путь через --config');
      expect(error.exitCode).toBe(1);
    }
  });

  test('reports broken json as a CLI error', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'config.json'), '{broken');

    expect(() => readConfig('config.json', dir)).toThrow(/не удалось прочитать/);
  });

  test('reads package.json and fails with a hint when it is absent', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"demo"}');
    expect(readProjectPackage(dir).name).toBe('demo');

    expect(() => readProjectPackage(path.join(dir, 'nested'))).toThrow(/package.json не найден/);
  });
});
