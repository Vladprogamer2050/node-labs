'use strict';

const { PORT, GROUP, STUDENT } = require('../config');
const { formatRussianTime } = require('./time');

/**
 * Task 1 - the HTML pages.
 * Every page shares one layout; styles are inline, so nothing depends on
 * external fonts, CDNs or files and the site works offline.
 */
const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/about', label: 'О разработчике' },
  { href: '/contacts', label: 'Контакты' },
  { href: '/api-docs', label: 'API docs' },
];

function layout({ title, heading, lead, active = '/', content }) {
  const nav = NAV.map(
    (item) =>
      `<a href="${item.href}"${item.href === active ? ' class="active" aria-current="page"' : ''}>${item.label}</a>`
  ).join('');

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1220;
      --card: #111c2e;
      --line: #23334d;
      --text: #e6edf7;
      --muted: #93a4bd;
      --accent: #34d399;
      --accent-soft: rgba(52, 211, 153, 0.1);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      padding: 24px 16px 48px;
      background: radial-gradient(circle at 15% 0%, #14324a 0%, var(--bg) 55%);
      color: var(--text);
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      line-height: 1.55;
    }
    .wrap { width: min(860px, 100%); margin: 0 auto; }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 22px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: rgba(17, 28, 46, 0.8);
    }
    nav a {
      padding: 7px 12px;
      border-radius: 8px;
      color: var(--muted);
      text-decoration: none;
      font-size: 14px;
    }
    nav a:hover, nav a:focus-visible { color: var(--text); background: var(--accent-soft); }
    nav a.active { color: #06251b; background: var(--accent); font-weight: 600; }
    main {
      padding: 32px 34px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: var(--card);
      box-shadow: 0 22px 55px rgba(2, 8, 20, 0.5);
    }
    .tag {
      display: inline-block;
      margin: 0 0 12px;
      padding: 4px 10px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--accent);
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    h1 { margin: 0 0 10px; font-size: 29px; line-height: 1.2; }
    .lead { margin: 0 0 26px; color: var(--muted); font-size: 16px; }
    h2 {
      margin: 26px 0 12px;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    dl { margin: 0; display: grid; gap: 10px; }
    dl div {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding-bottom: 9px;
      border-bottom: 1px solid var(--line);
    }
    dt { color: var(--muted); }
    dd { margin: 0; font-weight: 600; text-align: right; }
    a { color: var(--accent); }
    ul.routes { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
    ul.routes a {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--accent);
      text-decoration: none;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 13.5px;
    }
    ul.routes a span { color: var(--muted); font-family: inherit; }
    ul.routes a:hover, ul.routes a:focus-visible { border-color: var(--accent); background: var(--accent-soft); }
    footer { margin-top: 26px; color: var(--muted); font-size: 13px; }
    code {
      padding: 2px 6px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #0a1424;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 13px;
    }
    .cards { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .card { padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; background: #0d1829; }
    .card b { display: block; color: var(--muted); font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
    .card span { font-size: 15px; }
  </style>
</head>
<body>
  <div class="wrap">
    <nav>${nav}</nav>
    <main>
      <p class="tag">Node.js · Express.js</p>
      <h1>${heading}</h1>
      <p class="lead">${lead}</p>
      ${content}
      <footer>Сервер слушает порт ${PORT}. Данные хранятся в памяти и пересоздаются при запуске.</footer>
    </main>
  </div>
</body>
</html>`;
}

/** Task 1.3 - the home page. */
function renderHome(now = new Date()) {
  return layout({
    title: 'Лабораторная работа №16',
    heading: 'Лабораторная работа №16',
    lead: 'Добро пожаловать! Это сервер библиотеки на фреймворке Express.js.',
    active: '/',
    content: `
      <dl>
        <div><dt>Студент</dt><dd>${STUDENT.fullNameRu}</dd></div>
        <div><dt>Группа</dt><dd>${GROUP}</dd></div>
        <div><dt>Вариант</dt><dd>${STUDENT.variant}</dd></div>
        <div><dt>Дата и время</dt><dd><time>${formatRussianTime(now)}</time></dd></div>
      </dl>

      <h2>Страницы</h2>
      <ul class="routes">
        <li><a href="/about">GET /about <span>информация о разработчике</span></a></li>
        <li><a href="/contacts">GET /contacts <span>контактная информация</span></a></li>
        <li><a href="/api-docs">GET /api-docs <span>интерактивная документация Swagger</span></a></li>
      </ul>

      <h2>API</h2>
      <ul class="routes">
        <li><a href="/api/books">GET /api/books <span>каталог: фильтры, пагинация, сортировка, поиск</span></a></li>
        <li><a href="/api/books/stats">GET /api/books/stats <span>статистика библиотеки</span></a></li>
        <li><a href="/api/books/available">GET /api/books/available <span>доступные книги</span></a></li>
      </ul>`,
  });
}

/** Task 1.4 - information about the developer. */
function renderAbout() {
  return layout({
    title: 'О разработчике — Лабораторная работа №16',
    heading: 'О разработчике',
    lead: 'Информация о студенте, который выполнил лабораторную работу.',
    active: '/about',
    content: `
      <dl>
        <div><dt>ФИО</dt><dd>${STUDENT.fullNameRu}</dd></div>
        <div><dt>Группа</dt><dd>${GROUP}</dd></div>
        <div><dt>Вариант</dt><dd>${STUDENT.variant}</dd></div>
        <div><dt>Дисциплина</dt><dd>Node.js</dd></div>
      </dl>

      <h2>Стек лабораторной работы</h2>
      <div class="cards">
        <div class="card"><b>Сервер</b><span>Express 5</span></div>
        <div class="card"><b>Авторизация</b><span>JWT, bcrypt</span></div>
        <div class="card"><b>Валидация</b><span>Joi</span></div>
        <div class="card"><b>Документация</b><span>Swagger / OpenAPI</span></div>
      </div>

      <h2>Репозиторий</h2>
      <p><a href="${STUDENT.github}" target="_blank" rel="noreferrer">${STUDENT.github}</a></p>`,
  });
}

/** Task 1.5 - contact information. */
function renderContacts() {
  return layout({
    title: 'Контакты — Лабораторная работа №16',
    heading: 'Контакты',
    lead: 'Связаться с разработчиком можно через GitHub.',
    active: '/contacts',
    content: `
      <dl>
        <div><dt>GitHub</dt><dd><a href="${STUDENT.github}" target="_blank" rel="noreferrer">@Vladprogamer2050</a></dd></div>
        <div><dt>Репозиторий</dt><dd><a href="${STUDENT.repository}" target="_blank" rel="noreferrer">node-labs</a></dd></div>
        <div><dt>Группа</dt><dd>${GROUP}</dd></div>
      </dl>

      <h2>Как связаться</h2>
      <p>Issues и Pull Requests в репозитории — предпочтительный способ связи:
      они приходят на почту и сохраняют историю обсуждения.</p>`,
  });
}

/** HTML 404 for unknown pages; API routes return JSON instead. */
function renderNotFound(path) {
  return layout({
    title: 'Страница не найдена — Лабораторная работа №16',
    heading: '404 — страница не найдена',
    lead: `Маршрут ${path} не существует.`,
    content: `
      <ul class="routes">
        <li><a href="/">GET / <span>вернуться на главную</span></a></li>
        <li><a href="/api-docs">GET /api-docs <span>документация API</span></a></li>
      </ul>`,
  });
}

module.exports = { renderHome, renderAbout, renderContacts, renderNotFound };
