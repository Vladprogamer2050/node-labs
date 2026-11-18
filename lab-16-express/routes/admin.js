'use strict';

const express = require('express');
const store = require('../store');
const booksCache = require('../lib/books-cache');
const { OPERATIONS_LOG } = require('../config');
const { readRecentOperations } = require('../lib/operation-log');
const { validate, logsQuerySchema } = require('../lib/validation');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

/** Task 5.2 - the whole /api/admin area is available to administrators only. */
router.use(authenticate, requireRole('admin'));

/** Library statistics plus the cache state (task 5.7). */
router.get('/stats', (req, res) => {
  res.json({
    ...store.getStatistics(),
    cache: booksCache.stats(),
    logFile: OPERATIONS_LOG,
  });
});

/** Registered users without password hashes. */
router.get('/users', (req, res) => {
  const users = store.listUsers().map(store.toPublicUser);
  res.json({ total: users.length, data: users });
});

/** Last lines of the operation log - proof that task 4 writes to a file. */
router.get('/logs', async (req, res) => {
  const { limit } = validate(logsQuerySchema, req.query);
  const lines = await readRecentOperations(limit);
  res.json({ file: OPERATIONS_LOG, count: lines.length, lines });
});

module.exports = router;
