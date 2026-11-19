'use strict';

const chalk = require('chalk');

/**
 * Two-stream output, following the "Silence is Golden" principle:
 *
 *   stdout - only data (JSON, file contents), so it can be piped or redirected
 *   stderr - everything a human should read: progress, logs, warnings, errors
 *
 * Colors are used only when stderr is a real terminal. When the output is
 * redirected to a file, all escape sequences are dropped.
 */

const colorEnabled = Boolean(process.stderr.isTTY) && process.env.NO_COLOR === undefined;

function paint(style, text) {
  return colorEnabled ? style(text) : text;
}

function write(line) {
  process.stderr.write(`${line}\n`);
}

const logger = {
  /** Data for stdout: never colored, never prefixed. */
  data(text) {
    process.stdout.write(`${text}\n`);
  },

  /** Success message (green check mark). */
  success(message) {
    write(paint(chalk.green, `✔ ${message}`));
  },

  /** Warning (yellow triangle). */
  warning(message) {
    write(paint(chalk.yellow, `⚠ ${message}`));
  },

  /** Error (red cross). */
  error(message) {
    write(paint(chalk.red, `✖ ${message}`));
  },

  /** Informational message (blue). */
  info(message) {
    write(paint(chalk.blue, `ℹ ${message}`));
  },

  /** Additional explanation under an error (gray). */
  hint(message) {
    write(paint(chalk.gray, `  ${message}`));
  },

  /** Verbose line, printed only with --verbose. */
  verbose(enabled, message) {
    if (!enabled) return;
    write(paint(chalk.dim, `[VERBOSE] ${message}`));
  },

  /**
   * Top-level error handler: replaces stack traces with a readable message.
   * In development the stack is printed as well, in production it is hidden.
   */
  fatal(error) {
    const message = error && error.message ? error.message : String(error);
    const hint = error && error.hint ? error.hint : null;
    const details = error && error.details ? error.details : null;

    write(paint(chalk.red, `✖ Ошибка: ${message}`));
    if (hint) logger.hint(hint);
    if (details) logger.hint(`Подробности: ${details}`);

    const isProduction = process.env.NODE_ENV === 'production';
    // Expected CLI errors never need a stack trace; an unexpected exception
    // keeps it in development to make debugging possible.
    const isExpected = error && error.name === 'CliError';
    if (!isProduction && !isExpected && error && error.stack) {
      const stack = error.stack.split('\n').slice(1, 7).join('\n');
      write(paint(chalk.gray, stack));
    }

    process.exitCode = Number.isInteger(error && error.exitCode) ? error.exitCode : 1;
  },
};

module.exports = logger;
