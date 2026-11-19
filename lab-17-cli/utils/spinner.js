'use strict';

const logger = require('./logger');

/**
 * Thin wrapper around ora. The spinner is a UI element, so it is written to
 * stderr and disabled when stderr is not a terminal (CI, piped output).
 * In that case every step becomes a plain log line, so the log stays readable.
 */
function createSpinner(text) {
  const enabled = Boolean(process.stderr.isTTY) && process.env.CI !== 'true';

  if (!enabled) {
    logger.info(text);
    return {
      start() {
        return this;
      },
      stop() {
        return this;
      },
      succeed(message) {
        logger.success(message);
        return this;
      },
      fail(message) {
        logger.error(message);
        return this;
      },
      info(message) {
        logger.info(message);
        return this;
      },
      set text(value) {
        this._text = value;
      },
      get text() {
        return this._text;
      },
    };
  }

  const ora = require('ora');
  return ora({ text, stream: process.stderr, color: 'cyan', spinner: 'line' });
}

module.exports = { createSpinner };
