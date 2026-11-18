'use strict';

/**
 * Task 5.7 - in-memory cache for GET responses with a 5 minute lifetime.
 *
 * Only successful (200) JSON responses are cached. The same middleware is
 * mounted on the read-only endpoints, and every write operation calls
 * `cache.clear()`, so a client never receives stale data after a change.
 *
 * `X-Cache: HIT|MISS` and `X-Cache-TTL` make the behaviour visible in curl.
 */
function createCache({ ttlMs = 5 * 60 * 1000, name = 'cache' } = {}) {
  const entries = new Map();
  let hits = 0;
  let misses = 0;

  function middleware(req, res, next) {
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const hit = entries.get(key);

    if (hit && hit.expiresAt > Date.now()) {
      hits += 1;
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-TTL', String(Math.ceil((hit.expiresAt - Date.now()) / 1000)));
      return res.status(hit.status).type('application/json').send(hit.body);
    }

    misses += 1;
    res.set('X-Cache', 'MISS');

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        entries.set(key, {
          status: 200,
          body: JSON.stringify(body),
          expiresAt: Date.now() + ttlMs,
        });
      }
      return originalJson(body);
    };

    return next();
  }

  middleware.clear = () => entries.clear();

  middleware.stats = () => ({
    name,
    entries: entries.size,
    hits,
    misses,
    ttlSeconds: Math.round(ttlMs / 1000),
  });

  return middleware;
}

module.exports = { createCache };
