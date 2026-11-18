'use strict';

const { formatLogTime } = require('../lib/format');

/**
 * Task 3.2 - error handling.
 *
 * Registered as the first middleware, therefore it catches everything thrown
 * deeper in the chain (routes, body parser, "405 Method Not Allowed", ...).
 * The client always receives JSON:
 *
 *   {"error":"Внутренняя ошибка сервера","status":500}
 *   {"error":"Пользователь с id=99 не найден","status":404}
 */
module.exports = function errorHandler() {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      const status = Number(error.status || error.statusCode) || 500;

      // Internal details must never leak to the client.
      const message = status >= 500 ? 'Внутренняя ошибка сервера' : error.message;

      ctx.status = status;
      ctx.body = { error: message, status };

      if (status >= 500) {
        console.error(`[${formatLogTime()}] [error] ${error.stack || error.message}`);
      }
    }
  };
};
