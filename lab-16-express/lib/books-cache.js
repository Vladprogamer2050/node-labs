'use strict';

const { createCache } = require('./cache');
const { CACHE_TTL_MS } = require('../config');

/**
 * Task 5.7 - one shared cache instance for all read-only book endpoints and
 * for the administrator view that reports its statistics.
 */
module.exports = createCache({ ttlMs: CACHE_TTL_MS, name: 'books' });
