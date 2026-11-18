'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../store');
const { HttpError } = require('../lib/http-error');
const { validate, registerSchema, loginSchema } = require('../lib/validation');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { logOperation } = require('../lib/operation-log');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/** Access token: the user id, email and role, signed for one hour. */
function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Task 5.2 - registration.
 * The role is always "reader": administrator rights cannot be self-assigned.
 * The password is stored as a bcrypt hash, never as plain text.
 */
router.post('/register', async (req, res) => {
  const data = validate(registerSchema, req.body || {});

  if (store.findUserByEmail(data.email)) {
    throw new HttpError(409, 'Пользователь с таким email уже зарегистрирован');
  }

  const user = store.createUser({ ...data, role: 'reader' });
  await logOperation('REGISTER_USER', { user: user.email, details: user.name });

  res.status(201).json({
    message: 'Регистрация прошла успешно',
    user: store.toPublicUser(user),
  });
});

/** Task 5.2 - login: correct credentials give a JWT. */
router.post('/login', async (req, res) => {
  const data = validate(loginSchema, req.body || {});
  const user = store.findUserByEmail(data.email);
  const passwordMatches = user ? await bcrypt.compare(data.password, user.passwordHash) : false;

  if (!passwordMatches) {
    await logOperation('LOGIN_FAILED', { user: data.email });
    throw new HttpError(401, 'Неверный email или пароль');
  }

  await logOperation('LOGIN', { user: user.email });

  res.json({
    message: 'Вход выполнен',
    token: signToken(user),
    tokenType: 'Bearer',
    expiresIn: JWT_EXPIRES_IN,
    user: store.toPublicUser(user),
  });
});

/** Current user for the given token - useful for the Swagger "Authorize" flow. */
router.get('/me', authenticate, (req, res) => {
  res.json(store.toPublicUser(req.user));
});

module.exports = router;
