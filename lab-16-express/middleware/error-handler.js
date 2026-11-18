'use strict';

const { HttpError } = require('../lib/http-error');
const { formatLogTime } = require('../lib/time');
const { logOperation } = require('../lib/operation-log');

/**
 * Task 3.4 - centralized error handling.
 *
 * Express recognises the middleware by its four arguments. Everything thrown
 * or passed to next() ends up here and becomes a JSON response:
 *
 *   {"error":"Книга не найдена","status":404}
 *   {"error":"Некорректные данные","status":400,"details":["..."]}
 *
 * The stack trace of a 500 is printed to the console and written to the
 * operation log, but never returned to the client.
 */
module.exports = function errorHandler() {
  // eslint-disable-next-line no-unused-vars
  return (error, req, res, next) => {
    let status = Number(error.status || error.statusCode) || 500;
    let message = error.message;
    let details = error.details || null;

    // Broken JSON is a client error; express.json() reports it as an entity error.
    if (error.type === 'entity.parse.failed') {
      status = 400;
      message = 'Некорректный JSON в теле запроса';
    } else if (error.type === 'entity.too.large') {
      status = 413;
      message = 'Тело запроса слишком большое';
    } else if (status >= 500) {
      // Never leak internal details to the client.
      message = 'Внутренняя ошибка сервера';
      details = null;
    }

    if (!(error instanceof HttpError) && status >= 500) {
      console.error(`[${formatLogTime()}] [error] ${req.method} ${req.originalUrl}\n${error.stack || error.message}`);
      logOperation('SERVER_ERROR', { details: `${req.method} ${req.originalUrl}: ${error.message}` });
    }

    const body = { error: message, status };
    if (details) body.details = details;

    res.status(status).json(body);
  };
};
