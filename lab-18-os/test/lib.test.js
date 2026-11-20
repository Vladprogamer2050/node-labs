'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');

const config = require('../config');
const {
  formatUptime,
  maskMac,
  platformMessage,
  formatGb,
  percentage,
  formatPercent,
  formatTimestamp,
  formatLogLine,
} = require('../lib/format');
const {
  collectBaseInfo,
  collectCpuInfo,
  collectMemoryInfo,
  collectNetworkInfo,
  cpuLoadBetween,
} = require('../lib/system');

test('formatUptime formats hours, minutes and seconds', () => {
  assert.equal(formatUptime(0), '0 ч 0 мин 0 сек');
  assert.equal(formatUptime(3661), '1 ч 1 мин 1 сек');
  assert.equal(formatUptime(90061), '1 д 1 ч 1 мин 1 сек');
  assert.equal(formatUptime(-10), '0 ч 0 мин 0 сек');
  assert.equal(formatUptime('120'), '0 ч 2 мин 0 сек');
});

test('maskMac keeps the vendor prefix and hides the last three octets', () => {
  assert.equal(maskMac('aa:bb:cc:dd:ee:ff'), 'AA:BB:CC:**:**:**');
  assert.equal(maskMac('00:00:00:00:00:00'), 'нет');
  assert.equal(maskMac(null), 'нет');
  assert.equal(maskMac(undefined), 'нет');
});

test('platformMessage covers win32, linux, darwin and unknown platforms', () => {
  assert.equal(platformMessage('win32'), 'Вы работаете в Windows');
  assert.equal(platformMessage('linux'), 'Вы работаете в Linux');
  assert.equal(platformMessage('darwin'), 'Вы работаете в macOS');
  assert.equal(platformMessage('freebsd'), 'Неизвестная платформа');
});

test('formatGb and percentage helpers convert values', () => {
  assert.equal(formatGb(1024 ** 3), '1.00');
  assert.equal(formatGb(1.5 * 1024 ** 3), '1.50');
  assert.equal(percentage(1, 4), 25);
  assert.equal(percentage(1, 0), 0);
  assert.equal(formatPercent(25), '25.0%');
  assert.equal(formatPercent(12.345, 2), '12.35%');
});

test('formatTimestamp and formatLogLine use the required log format', () => {
  const date = new Date(2026, 0, 5, 7, 8, 9);

  assert.equal(formatTimestamp(date), '2026-01-05 07:08:09');
  assert.equal(
    formatLogLine(date, config.group, 'тестовое сообщение'),
    '[2026-01-05 07:08:09] [478] Предупреждение: тестовое сообщение',
  );
});

test('cpuLoadBetween calculates busy / total * 100', () => {
  const before = [{ user: 100, nice: 0, sys: 50, idle: 850, irq: 0 }];
  const after = [{ user: 300, nice: 0, sys: 100, idle: 1600, irq: 0 }];

  const result = cpuLoadBetween(before, after);

  assert.equal(result.totalDiff, 1000);
  assert.equal(result.idleDiff, 750);
  assert.equal(result.busyDiff, 250);
  assert.equal(result.percent, 25);
  assert.equal(result.cores, 1);
});

test('cpuLoadBetween returns zero when no CPU time has passed', () => {
  const sample = [{ user: 10, nice: 0, sys: 5, idle: 90, irq: 0 }];
  const result = cpuLoadBetween(sample, sample);

  assert.equal(result.percent, 0);
  assert.equal(result.totalDiff, 0);
});

test('collectBaseInfo matches the real platform', () => {
  const info = collectBaseInfo();

  assert.equal(info.platform, os.platform());
  assert.equal(info.type, os.type());
  assert.equal(info.arch, os.arch());
  assert.equal(info.release, os.release());
  assert.equal(info.hostname, os.hostname());
  assert.equal(info.message, platformMessage(info.platform));
  assert.match(info.uptime, /\d+ ч \d+ мин \d+ сек/);
});

test('collectCpuInfo reports every logical core', () => {
  const info = collectCpuInfo();
  const cpus = os.cpus();

  assert.equal(info.cores, cpus.length);
  assert.equal(info.speeds.length, cpus.length);
  assert.ok(info.averageSpeed > 0);
  assert.ok(info.model.length > 0);
});

test('collectMemoryInfo respects the free memory threshold', () => {
  const relaxed = collectMemoryInfo({ freeMemory: 0 });
  const strict = collectMemoryInfo({ freeMemory: 100 });

  assert.equal(relaxed.low, false);
  assert.equal(strict.low, true);
  assert.ok(relaxed.total > relaxed.free);
  assert.ok(relaxed.usedPercent >= 0 && relaxed.usedPercent <= 100);
});

test('collectNetworkInfo lists interfaces and masks MAC addresses on request', () => {
  const raw = collectNetworkInfo();
  const masked = collectNetworkInfo({ maskSecrets: true });

  assert.equal(raw.total, Object.keys(os.networkInterfaces()).length);
  assert.ok(raw.list.length > 0);

  for (const item of masked.list) {
    assert.equal(item.mac, item.maskedMac);
    assert.ok(item.mac === 'нет' || item.mac.endsWith(':**:**:**'));
  }
});
