'use strict';

const os = require('os');

const config = require('../config');
const { formatUptime, maskMac, platformMessage, percentage } = require('./format');

/**
 * Task 1: platform, architecture, hostname and uptime.
 * @returns {object}
 */
function collectBaseInfo() {
  const platform = os.platform();
  const uptime = os.uptime();

  return {
    platform,
    type: os.type(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    uptimeSeconds: Math.round(uptime),
    uptime: formatUptime(uptime),
    message: platformMessage(platform),
  };
}

/**
 * Task 2: logical cores, CPU model, per-core and average frequency.
 * @returns {object}
 */
function collectCpuInfo() {
  const cpus = os.cpus();
  const speeds = cpus.map((cpu) => cpu.speed);
  const sum = speeds.reduce((total, value) => total + value, 0);

  return {
    cores: cpus.length,
    model: cpus.length > 0 ? cpus[0].model.trim().replace(/\s+/g, ' ') : 'неизвестно',
    speeds,
    averageSpeed: speeds.length > 0 ? Math.round(sum / speeds.length) : 0,
  };
}

/**
 * Task 2: total, free and used memory plus the adaptive low-memory flag.
 * @param {{ freeMemory: number }} [thresholds] free memory limit in percent
 * @returns {object}
 */
function collectMemoryInfo(thresholds = config.thresholds) {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const limit = Number(thresholds.freeMemory) || 0;

  return {
    total,
    free,
    used,
    usedPercent: percentage(used, total),
    freePercent: percentage(free, total),
    freeLimit: limit,
    low: percentage(free, total) < limit,
  };
}

/**
 * Task 2: 1, 5 and 15 minute load average. Always zero on Windows.
 * @returns {{ values: number[], available: boolean }}
 */
function collectLoadAverage() {
  return {
    values: os.loadavg(),
    available: os.platform() !== 'win32',
  };
}

/**
 * Task 3: current user, uid/gid (UNIX only), home directory and shell.
 * @returns {object}
 */
function collectUserInfo() {
  const user = os.userInfo();
  const uidAvailable = Number.isInteger(user.uid) && user.uid >= 0;

  return {
    username: user.username,
    uid: user.uid,
    gid: user.gid,
    homedir: user.homedir,
    shell: user.shell,
    uidAvailable,
    isRoot: uidAvailable && user.uid === 0,
  };
}

/**
 * Task 3: network interfaces with IPv4/IPv6 addresses, MAC addresses
 * and the "primary" interface (first external IPv4).
 * With maskSecrets the raw MAC address is not exposed at all.
 * @param {{ maskSecrets?: boolean }} [options]
 * @returns {{ list: object[], total: number, primary: object|null }}
 */
function collectNetworkInfo(options = {}) {
  const maskSecrets = Boolean(options.maskSecrets);
  const interfaces = os.networkInterfaces();

  const list = Object.keys(interfaces).map((name) => {
    const addresses = interfaces[name] || [];
    const ipv4 =
      addresses.find((item) => item.family === 'IPv4' && !item.internal) ||
      addresses.find((item) => item.family === 'IPv4') ||
      null;
    const ipv6 =
      addresses.find((item) => item.family === 'IPv6' && !item.internal) ||
      addresses.find((item) => item.family === 'IPv6') ||
      null;
    const macSource = ipv4 || ipv6 || addresses[0] || null;
    const mac = macSource ? macSource.mac : null;
    const maskedMac = maskMac(mac);
    const internal = addresses.length > 0 && addresses.every((item) => item.internal);

    return {
      name,
      ipv4: ipv4 ? ipv4.address : null,
      ipv6: ipv6 ? ipv6.address : null,
      mac: maskSecrets ? maskedMac : mac,
      maskedMac,
      internal,
    };
  });

  const primary = list.find((item) => !item.internal && item.ipv4) || null;

  return { list, total: list.length, primary };
}

/**
 * Takes CPU time counters for the load calculation between two moments.
 * @returns {object[]}
 */
function cpuTimesSnapshot() {
  return os.cpus().map((cpu) => ({
    user: cpu.times.user || 0,
    nice: cpu.times.nice || 0,
    sys: cpu.times.sys || 0,
    idle: cpu.times.idle || 0,
    irq: cpu.times.irq || 0,
  }));
}

/**
 * Task 4: load between two os.cpus() samples.
 * load = busy_diff / total_diff * 100, where busy = total - idle.
 * @param {object[]} before
 * @param {object[]} after
 * @returns {{ percent: number, busyDiff: number, idleDiff: number, totalDiff: number, cores: number }}
 */
function cpuLoadBetween(before, after) {
  const length = Math.min(before.length, after.length);
  let busyDiff = 0;
  let idleDiff = 0;
  let totalDiff = 0;

  for (let index = 0; index < length; index += 1) {
    const first = before[index];
    const second = after[index];

    const total =
      (second.user - first.user) +
      (second.nice - first.nice) +
      (second.sys - first.sys) +
      (second.idle - first.idle) +
      (second.irq - first.irq);
    const idle = second.idle - first.idle;

    totalDiff += total;
    idleDiff += idle;
    busyDiff += total - idle;
  }

  return {
    percent: totalDiff > 0 ? (busyDiff / totalDiff) * 100 : 0,
    busyDiff,
    idleDiff,
    totalDiff,
    cores: length,
  };
}

/**
 * Task 4: one system snapshot for the first data collection.
 * @param {object} [extra] additional fields merged into the snapshot
 * @returns {object}
 */
function collectSnapshot(extra = {}) {
  return {
    lab: config.lab,
    group: config.group,
    variant: config.variant,
    timestamp: new Date().toISOString(),
    base: collectBaseInfo(),
    cpu: collectCpuInfo(),
    memory: collectMemoryInfo(),
    loadAverage: collectLoadAverage(),
    network: collectNetworkInfo({ maskSecrets: true }),
    user: collectUserInfo(),
    ...extra,
  };
}

module.exports = {
  collectBaseInfo,
  collectCpuInfo,
  collectMemoryInfo,
  collectLoadAverage,
  collectUserInfo,
  collectNetworkInfo,
  cpuTimesSnapshot,
  cpuLoadBetween,
  collectSnapshot,
};
