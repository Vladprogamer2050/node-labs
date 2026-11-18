'use strict';

const Router = require('@koa/router');
const store = require('../store');
const { HttpError } = require('../lib/http-error');
const { parseId, requireString, parseGroup } = require('../lib/validation');

const router = new Router({ prefix: '/api/users' });

/** Task 2.1 - the whole list. */
router.get('/', (ctx) => {
  ctx.body = store.listUsers();
});

/** The assignment requires 404 for a missing user, so a single user can be read too. */
router.get('/:id', (ctx) => {
  const id = parseId(ctx.params.id, 'пользователя');
  const user = store.findUser(id);

  if (!user) {
    throw new HttpError(404, `Пользователь с id=${id} не найден`);
  }
  ctx.body = user;
});

/** Task 2.2 - create: id is assigned by the server, the body is validated. */
router.post('/', (ctx) => {
  const body = ctx.request.body || {};

  const user = store.createUser({
    name: requireString(body.name, 'name', 80),
    group: parseGroup(body.group),
  });

  ctx.status = 201;
  ctx.body = user;
});

/** Task 2.3 - update: PUT replaces both fields, so both are required. */
router.put('/:id', (ctx) => {
  const id = parseId(ctx.params.id, 'пользователя');
  if (!store.findUser(id)) {
    throw new HttpError(404, `Пользователь с id=${id} не найден`);
  }

  const body = ctx.request.body || {};
  ctx.body = store.updateUser(id, {
    name: requireString(body.name, 'name', 80),
    group: parseGroup(body.group),
  });
});

/** Task 2.4 - delete. */
router.delete('/:id', (ctx) => {
  const id = parseId(ctx.params.id, 'пользователя');
  const user = store.findUser(id);

  if (!user) {
    throw new HttpError(404, `Пользователь с id=${id} не найден`);
  }

  store.deleteUser(id);
  ctx.body = { message: `Пользователь с id=${id} удалён`, user };
});

module.exports = router;
