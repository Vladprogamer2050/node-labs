'use strict';

const app = require('./app');
const { PORT, GROUP, STUDENT } = require('./config');

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Лабораторная работа №15 - сервер на Koa.js');
  console.log(`Студент: ${STUDENT.fullNameRu}, группа ${GROUP}`);
  console.log(`Адрес: http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('Сервер запущен и готов принимать запросы.');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} уже занят: остановите другой сервер или задайте PORT.`);
  } else {
    console.error('Не удалось запустить сервер:', error.message);
  }
  process.exitCode = 1;
});

// Graceful shutdown: stop accepting connections and close the process.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\nПолучен ${signal}, сервер останавливается...`);
    server.close(() => process.exit(0));
  });
}
