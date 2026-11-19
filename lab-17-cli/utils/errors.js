'use strict';

/**
 * Error that is expected by the CLI: it carries a user-facing message, an
 * optional hint and an exit code, so the top-level handler can print it
 * without a stack trace.
 */
class CliError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CliError';
    this.hint = options.hint || null;
    this.details = options.details || null;
    this.exitCode = Number.isInteger(options.exitCode) ? options.exitCode : 1;
  }
}

module.exports = { CliError };
