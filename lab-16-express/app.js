'use strict';

const express = require('express');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./docs/swagger');
const { RATE_LIMIT } = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/error-handler');
const notFound = require('./middleware/not-found');

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const bookRoutes = require('./routes/books');

const app = express();

// The framework version is not advertised: a small, free hardening step.
app.disable('x-powered-by');

/**
 * Task 3.2 - compression for every response.
 * gzip or deflate is chosen from Accept-Encoding; the threshold keeps tiny
 * responses uncompressed, because the headers would cost more than the body.
 */
app.use(compression());

/** JSON bodies for the REST API; 1 MB is plenty for this lab. */
app.use(express.json({ limit: '1mb' }));

/**
 * CSV bodies for POST /api/books/import (task 5.4).
 * The file content is the request body, so no multipart parser is needed.
 */
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }));

/** Task 3.1 - request logging. Registered early, so every request is logged. */
app.use(logger());

/**
 * Task 3.3 - rate limiting: at most 100 requests per minute from one IP.
 * Applied to the API and auth routes; static documentation stays reachable.
 * The handler always answers with JSON and a Retry-After header.
 */
const limiter = rateLimit({
  windowMs: RATE_LIMIT.windowMs,
  limit: RATE_LIMIT.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    const resetAt = req.rateLimit && req.rateLimit.resetTime ? req.rateLimit.resetTime : Date.now();
    const retryAfter = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));

    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Слишком много запросов с одного IP, попробуйте позже',
      status: 429,
      retryAfterSeconds: retryAfter,
    });
  },
});

app.use(['/api', '/auth'], limiter);

/** Task 1 - HTML pages and the two error demonstration routes. */
app.use('/', indexRoutes);

/** Task 5.2 - registration and login. */
app.use('/auth', authRoutes);

/** Task 5.3 - administrator area. */
app.use('/api/admin', adminRoutes);

/** Tasks 2, 4, 5 - the book catalogue. */
app.use('/api/books', bookRoutes);

/** Task 5.5 - interactive documentation and the raw OpenAPI document. */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Library API — Lab 16',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    displayRequestDuration: true,
  },
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

/** JSON 404 for the API, an HTML page for the site. */
app.use(notFound);

/** Task 3.4 - centralized error handling, always the last middleware. */
app.use(errorHandler());

module.exports = app;
