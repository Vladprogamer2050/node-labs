# Lab 18 — Exploring the Node.js `os` module

**Student:** Evdokimov Vladislav Evgenievich
**Group:** 478
**Variant:** 7

The project uses only built-in Node.js modules (`os`, `fs`, `path`), so no
third-party dependencies and no `npm install` are required. Node.js 18 or
newer is enough.

## Project structure

```
lab-18-os/
├── config.js              # student data and thresholds
├── lib/
│   ├── args.js            # tiny CLI argument parser
│   ├── format.js          # uptime, MAC masking, percentages, log lines
│   └── system.js          # data collection and CPU load calculation
├── test/
│   └── lib.test.js        # node:test unit tests
├── os-info.js             # task 1: platform and architecture
├── os-resources.js        # task 2: CPU, memory, load average
├── os-network.js          # task 3: network interfaces and user
├── os-monitor.js          # task 4: real-time monitoring
├── package.json
└── README.md
```

## Task 1 (basic level) — platform and architecture

```bash
node os-info.js
```

Prints `os.platform()`, `os.type()`, `os.arch()`, `os.release()`,
`os.hostname()` and `os.uptime()` (both formatted and in seconds), then the
platform-dependent message: Windows, Linux, macOS or "unknown platform".

## Task 2 (medium level) — CPU, memory and load average

```bash
node os-resources.js                     # all sections
node os-resources.js --section cpu
node os-resources.js --section memory
node os-resources.js --section load
node os-resources.js --section memory --free-limit 95
```

* logical cores, CPU model, frequency of every core and the average frequency;
* total, free and used memory in GB with percentages;
* a warning when free memory is below the threshold (20% by default);
* 1/5/15 minute load average with a note that Windows always reports zeros.

`--free-limit <0..100>` overrides the free memory threshold. It exists to
demonstrate the warning branch on a machine that currently has plenty of RAM.

## Task 3 (advanced level) — network interfaces and user

```bash
node os-network.js                      # all sections
node os-network.js --section interfaces
node os-network.js --section user
node os-network.js --section mac
node os-network.js --section root
```

* every interface with its IPv4/IPv6 address and internal/external flag;
* the "primary" interface — the first external IPv4 address;
* MAC addresses are masked (`AA:BB:CC:**:**:**`), the vendor prefix stays visible;
* current user, `uid`/`gid` (UNIX only), home directory and shell;
* a root check: on Windows `uid` is `-1`, so the check reports that the
  superuser privileges were not detected.

The snapshot in task 4 never contains raw MAC addresses: `collectNetworkInfo`
has a `maskSecrets` option that replaces them with the masked form.

## Task 4 (hard level) — real-time monitoring

```bash
node os-monitor.js                          # update every 2 seconds
node os-monitor.js --interval 1000          # update every second
node os-monitor.js --once                   # single snapshot as JSON
node os-monitor.js --explain --interval 1000 --ticks 3
```

Flags:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--interval <ms>` | `2000` | refresh interval, 250..60000 ms |
| `--ticks <n>` | `0` (infinite) | stop after `n` updates, useful for demos |
| `--once` | — | print one snapshot object as JSON and exit |
| `--explain` | — | print the busy/total math of every CPU sample as lines |
| `--cpu-warning <n>` | `50` | CPU warning threshold, percent |
| `--cpu-critical <n>` | `80` | CPU critical threshold, percent |
| `--mem-critical <n>` | `10` | free memory warning threshold, percent |

How it works:

1. The initial snapshot collects the data of tasks 1–3 into one object with a
   timestamp and the group number.
2. Two `os.cpus()` samples are taken; the load is
   `busy_diff / total_diff * 100`, where `busy = total - idle`.
3. The status line is redrawn with `\r`; `Ctrl+C` stops the monitor and prints
   the number of warnings.
4. CPU above 80% is critical (`[!!]`), above 50% is a warning (`[!]`), free memory
   below 10% is also a warning.
5. Every anomaly is appended to `monitor.log` in the required format:

```
[2026-11-19 14:05:02] [478] Предупреждение: критическая загрузка CPU: 92.4%
```

Only state transitions are logged, so a stable high load does not flood the
file with identical lines.

## Tests

```bash
npm test
```

Uses the built-in `node:test` runner: formatting helpers, timestamp/log
format, the CPU load formula, threshold handling and network data masking.

## Windows notes

* `os.loadavg()` always returns `[0, 0, 0]` on Windows — this is a platform
  limitation, the real CPU load is calculated from `os.cpus()`;
* `uid`, `gid` and `shell` are not available on Windows (`-1` and `null`);
* the console must use UTF-8 (`chcp 65001`) to display the Russian output.
