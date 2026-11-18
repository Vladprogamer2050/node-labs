'use strict';

const express = require('express');
const pages = require('../lib/pages');
const { GROUP, STUDENT } = require('../config');

const router = express.Router();

/** Task 1.3 - the main page with the lab title, group, time and routes. */
router.get('/', (req, res) => {
  res.type('html').send(pages.renderHome(new Date()));
});

/** Task 1.4 - developer information. */
router.get('/about', (req, res) => {
  res.type('html').send(pages.renderAbout());
});

/** Task 1.5 - contact information. */
router.get('/contacts', (req, res) => {
  res.type('html').send(pages.renderContacts());
});

/** Public health check: needed for the rate limiter demo and for uptime. */
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Number(process.uptime().toFixed(1)),
    group: GROUP,
    student: STUDENT.fullNameRu,
    time: new Date().toISOString(),
  });
});

/**
 * Task 3.5 - a synchronous exception.
 * Express 5 catches errors thrown in handlers, but next(error) keeps the
 * behaviour obvious and also works on Express 4.
 */
router.get('/error', (req, res, next) => {
  try {
    throw new Error('Тестовое исключение из маршрута /error');
  } catch (error) {
    next(error);
  }
});

/** Task 3.5 - an asynchronous exception, also handled centrally. */
router.get('/async-error', async (req, res, next) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new Error('Тестовая асинхронная ошибка из маршрута /async-error');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
