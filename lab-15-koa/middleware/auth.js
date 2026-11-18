'use strict';

const { HttpError } = require('../lib/http-error');

/**
 * Task 3.3 - authorization middleware.
 *
 * Protected routes require the Authorization header:
 *   - no header  -> 401 {"error":"Требуется заголовок Authorization","status":401}
 *   - any header -> the request continues, the value is available as ctx.state.authorization
 *
 * The lab only checks that the header is present; a real service would verify
 * the token (JWT signature, expiration, scopes) at this point.
 */
module.exports = function requireAuthorization() {
  return async (ctx, next) => {
    const header = ctx.get('Authorization');

    if (!header) {
      throw new HttpError(401, 'Требуется заголовок Authorization');
    }

    ctx.state.authorization = header;
    await next();
  };
};
