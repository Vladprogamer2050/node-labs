'use strict';

/**
 * Progress bar for iterative work (processing N files).
 * cli-progress redraws a single line with \r on stderr; when stderr is not a
 * terminal the bar is replaced by a no-op, so piped logs are not polluted.
 */
function createProgressBar(total) {
  const enabled = Boolean(process.stderr.isTTY) && process.env.CI !== 'true';

  if (!enabled || total <= 0) {
    return {
      start() {
        return this;
      },
      update() {
        return this;
      },
      stop() {
        return this;
      },
    };
  }

  const cliProgress = require('cli-progress');
  const bar = new cliProgress.SingleBar(
    {
      format: '[{bar}] {percentage}% | {value}/{total} | ETA: {eta_formatted}',
      barCompleteChar: '#',
      barIncompleteChar: '.',
      barsize: 24,
      stream: process.stderr,
      hideCursor: true,
      clearOnComplete: false,
      etaBuffer: 4,
    }
  );

  bar.start(total, 0);
  return bar;
}

module.exports = { createProgressBar };
