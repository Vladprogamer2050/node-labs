'use strict';

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { HttpError } = require('../lib/http-error');
const store = require('../store');

/**
 * Task 5.2 - JWT authentication and role checks.
 *
 * authenticate: requires "Authorization: Bearer <token>", verifies the
 * signature and the expiration, then loads the user, so a deleted account
 * cannot keep using an old token.
 *
 * requireRole: 403 unless the authenticated user has one of the given roles.
 */
function authenticate(req, res, next) {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Требуется заголовок Authorization: Bearer <token>'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = store.findUserById(Number(payload.sub));

    if (!user) {
      return next(new HttpError(401, 'Пользователь из токена не найден'));
    }

    req.user = user;
    req.tokenPayload = payload;
    return next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Срок действия токена истёк, войдите заново'
        : 'Недействительный токен';
    return next(new HttpError(401, message));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new HttpError(401, 'Требуется авторизация'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, `Недостаточно прав: требуется роль ${roles.join(' или ')}`));
    }
    return next();
  };
}

module.exports = { authenticate, requireRole };
