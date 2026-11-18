'use strict';

/**
 * Lab 16 - shared configuration.
 * PORT and JWT_SECRET can be overridden with environment variables.
 */
const PORT = Number(process.env.PORT) || 3000;

/** Student data, shown on the HTML pages and in the server banner. */
const GROUP = '478';
const STUDENT = {
  fullNameRu: 'Евдокимов Владислав Евгеньевич',
  fullNameEn: 'Evdokimov Vladislav Evgenievich',
  group: GROUP,
  variant: 7,
  github: 'https://github.com/Vladprogamer2050',
  repository: 'https://github.com/Vladprogamer2050/node-labs',
};

/**
 * The development secret is fine for a lab that runs locally; a real service
 * must take the secret from the environment and rotate it.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'lab-16-express-development-secret';
const JWT_EXPIRES_IN = '1h';

/** Task 5.7 - in-memory cache for GET responses, 5 minutes. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Task 3.3 - no more than 100 requests per minute from one IP. */
const RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 100,
};

/** Genres used by the generator, validation and the statistics. */
const GENRES = [
  'роман',
  'фантастика',
  'детектив',
  'история',
  'поэзия',
  'биография',
  'наука',
  'приключения',
  'фэнтези',
  'классика',
];

/** Task 5.1 - 100 books are generated from the group number. */
const GENERATED_BOOKS = 100;

/** Path of the operation log (task 4, "логирование всех операций в файл"). */
const OPERATIONS_LOG = 'logs/operations.log';

module.exports = {
  PORT,
  GROUP,
  STUDENT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CACHE_TTL_MS,
  RATE_LIMIT,
  GENRES,
  GENERATED_BOOKS,
  OPERATIONS_LOG,
};
