'use strict';

/**
 * Error with an HTTP status code.
 * The error middleware turns it into a JSON response
 * {"error": "...", "status": 400} and keeps the status code.
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

module.exports = { HttpError };
