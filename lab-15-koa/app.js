'use strict';

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const errorHandler = require('./middleware/error-handler');
const logger = require('./middleware/logger');

const indexRoutes = require('./routes/index');
const userRoutes = require('./routes/users');
const debugRoutes = require('./routes/debug');
const studentRoutes = require('./routes/students');

const app = new Koa();

/**
 * Middleware order matters:
 * 1. error handler - the outermost layer, catches everything below it;
 * 2. logger - measures the whole request, including failed ones;
 * 3. body parser - JSON bodies for POST/PUT;
 * 4. routers - the actual endpoints;
 * 5. fallback - JSON 404 for unknown routes.
 */
app.use(errorHandler());
app.use(logger());

app.use(
  bodyParser({
    enableTypes: ['json'],
    onerror: (error, ctx) => {
      // Broken JSON is a client error, not a server error.
      ctx.throw(400, 'Некорректный JSON в теле запроса');
    },
  })
);

for (const router of [indexRoutes, userRoutes, debugRoutes, studentRoutes]) {
  app.use(router.routes());
  app.use(router.allowedMethods());
}

app.use((ctx) => {
  ctx.status = 404;
  ctx.body = { error: `Маршрут ${ctx.method} ${ctx.path} не найден`, status: 404 };
});

module.exports = app;
