'use strict';

const Router = require('@koa/router');
const { PORT, GROUP, STUDENT } = require('../config');
const { formatRussianTime } = require('../lib/format');

const router = new Router();

/** Task 1 - the HTML page. Everything is inline: no external styles or fonts. */
function renderPage(now) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Лабораторная работа №15</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f172a;
      --card: #1e293b;
      --line: #334155;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #38bdf8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px 16px;
      background: radial-gradient(circle at 20% 20%, #1e3a5f 0%, var(--bg) 55%);
      color: var(--text);
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      line-height: 1.5;
    }
    main {
      width: min(720px, 100%);
      padding: 36px 40px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--card);
      box-shadow: 0 24px 60px rgba(2, 6, 23, 0.55);
    }
    .tag {
      display: inline-block;
      margin: 0 0 12px;
      padding: 4px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--accent);
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    h1 { margin: 0 0 8px; font-size: 30px; }
    .greeting { margin: 0 0 28px; color: var(--muted); font-size: 17px; }
    dl { margin: 0 0 28px; display: grid; gap: 12px; }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
    }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 600; text-align: right; }
    time { font-variant-numeric: tabular-nums; }
    h2 { margin: 0 0 12px; font-size: 15px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
    ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
    a {
      display: block;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--accent);
      text-decoration: none;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 14px;
    }
    a:hover, a:focus-visible { border-color: var(--accent); background: rgba(56, 189, 248, 0.08); }
    footer { margin-top: 24px; color: var(--muted); font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <p class="tag">Node.js · Koa.js</p>
    <h1>Лабораторная работа №15</h1>
    <p class="greeting">Добро пожаловать! Это простой сервер на фреймворке Koa.js.</p>

    <dl>
      <div><dt>Студент</dt><dd>${STUDENT.fullNameRu}</dd></div>
      <div><dt>Группа</dt><dd>${GROUP}</dd></div>
      <div><dt>Дата и время</dt><dd><time>${formatRussianTime(now)}</time></dd></div>
    </dl>

    <h2>Доступные маршруты</h2>
    <ul>
      <li><a href="/api/users">GET /api/users — список пользователей</a></li>
      <li><a href="/students?limit=5">GET /students?limit=5 — студенты с пагинацией</a></li>
      <li><a href="/protected">GET /protected — только с заголовком Authorization</a></li>
      <li><a href="/error">GET /error — демонстрация обработчика ошибок</a></li>
    </ul>

    <footer>Сервер слушает порт ${PORT}. Данные хранятся в памяти и пересоздаются при запуске.</footer>
  </main>
</body>
</html>`;
}

/** Task 1: the page is rendered per request, so the date is always current. */
router.get('/', (ctx) => {
  ctx.type = 'text/html; charset=utf-8';
  ctx.body = renderPage(new Date());
});

module.exports = router;
