'use strict';

const { formatLogTime } = require('../lib/format');

/**
 * Task 3.1 - request logging.
 *
 * The start line records the moment the request arrived, the finish line records
 * the method, the path, the status and the duration in milliseconds:
 *
 *   [2026-11-18 14:30:25] --> GET /api/users
 *   [2026-11-18 14:30:25] GET /api/users 200 - 3.4ms
 */
module.exports = function logger() {
  return async (ctx, next) => {
    const startedAt = new Date();
    const startedHr = process.hrtime.bigint();

    console.log(`[${formatLogTime(startedAt)}] --> ${ctx.method} ${ctx.originalUrl}`);

    try {
      await next();
    } finally {
      // finally: the line is printed even when the request failed.
      const durationMs = Number(process.hrtime.bigint() - startedHr) / 1e6;
      console.log(
        `[${formatLogTime(startedAt)}] ${ctx.method} ${ctx.originalUrl} ` +
          `${ctx.status} - ${durationMs.toFixed(1)}ms`
      );
    }
  };
};
