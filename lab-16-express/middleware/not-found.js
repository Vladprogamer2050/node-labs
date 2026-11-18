'use strict';

const { renderNotFound } = require('../lib/pages');

/**
 * Final 404 handler.
 * API clients receive JSON, browser users receive an HTML page with links.
 */
module.exports = function notFound(req, res) {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return res.status(404).json({ error: `Маршрут ${req.method} ${req.path} не найден`, status: 404 });
  }
  return res.status(404).type('html').send(renderNotFound(req.path));
};
