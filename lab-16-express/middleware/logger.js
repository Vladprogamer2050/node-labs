'use strict';

const { formatLogTime } = require('../lib/time');

/**
 * Task 3.1 - request logging.
 *
 * One line per request, after the response has been sent:
 *
 *   [2026-11-18 15:20:11] GET /api/books 200 - 4.2ms
 *
 * The time is the moment the request arrived, the duration is measured with
 * process.hrtime, so it includes the middleware chain and the handler.
 */
module.exports = function logger() {
  return (req, res, next) => {
    const startedAt = new Date();
    const startedHr = process.hrtime.bigint();

    // Cyrillic query values arrive percent-encoded; show them decoded, which is
    // what the client actually asked for. The raw URL is kept if decoding fails.
    let displayUrl = req.originalUrl;
    try {
      displayUrl = decodeURIComponent(displayUrl);
    } catch {
      /* malformed escape sequence: keep the raw URL */
    }

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedHr) / 1e6;
      console.log(
        `[${formatLogTime(startedAt)}] ${req.method} ${displayUrl} ` +
          `${res.statusCode} - ${durationMs.toFixed(1)}ms`
      );
    });

    next();
  };
};
