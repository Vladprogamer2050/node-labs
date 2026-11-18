'use strict';

const Router = require('@koa/router');
const requireAuthorization = require('../middleware/auth');
const { maskAuthorization } = require('../lib/format');

const router = new Router();

/**
 * Task 3.3 - the protected route: reachable only with the Authorization header.
 * The header value is masked before it is returned, tokens must not leak.
 */
router.get('/protected', requireAuthorization(), (ctx) => {
  ctx.body = {
    message: 'Доступ к защищённому маршруту разрешён',
    authorization: maskAuthorization(ctx.state.authorization),
    time: new Date().toISOString(),
  };
});

/**
 * Task 3.4 - the route always throws, so the error middleware has something to catch.
 * The client receives {"error":"Внутренняя ошибка сервера","status":500}.
 */
router.get('/error', () => {
  throw new Error('Тестовое исключение из маршрута /error');
});

module.exports = router;
