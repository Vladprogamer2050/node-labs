'use strict';

/**
 * Error with an HTTP status code.
 * The error middleware turns it into {"error": "...", "status": ...}.
 */
class HttpError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

module.exports = { HttpError };
