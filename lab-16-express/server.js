'use strict';

const app = require('./app');
const store = require('./store');
const { PORT, GROUP, STUDENT, OPERATIONS_LOG, JWT_EXPIRES_IN, RATE_LIMIT } = require('./config');
const { logOperation } = require('./lib/operation-log');

const server = app.listen(PORT, async () => {
  const books = store.listBooks().length;

  console.log('='.repeat(66));
  console.log('Лабораторная работа №16 - сервер библиотеки на Express.js');
  console.log(`Студент: ${STUDENT.fullNameRu}, группа ${GROUP}, вариант ${STUDENT.variant}`);
  console.log(`Адрес: http://localhost:${PORT}`);
  console.log(`Документация Swagger: http://localhost:${PORT}/api-docs`);
  console.log(`Книг в каталоге: ${books} (сгенерированы из номера группы ${GROUP})`);
  console.log(`Лимит запросов: ${RATE_LIMIT.max} в минуту с одного IP`);
  console.log(`JWT действует: ${JWT_EXPIRES_IN}`);
  console.log(`Журнал операций: ${OPERATIONS_LOG}`);
  console.log('Демо-аккаунты: admin@example.com / Admin123! (admin), reader@example.com / Reader123! (reader)');
  console.log('='.repeat(66));
  console.log('Сервер запущен и готов принимать запросы.');

  await logOperation('SERVER_START', { details: `books=${books} port=${PORT}` });
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

module.exports = server;
