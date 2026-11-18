'use strict';

const { HttpError } = require('./http-error');

/** Route id must be a positive integer, otherwise 400. */
function parseId(value, entity = 'объекта') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, `Некорректный id ${entity}: ${value}`);
  }
  return id;
}

/** Required non-empty string with a length limit. */
function requireString(value, field, maxLength = 100) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `Поле "${field}" обязательно и должно быть строкой`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `Поле "${field}" не может быть пустым`);
  }
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `Поле "${field}" длиннее ${maxLength} символов`);
  }
  return trimmed;
}

/** Group code: letters, digits and dashes ("478-1", "ББМО-01-23"). */
function parseGroup(value) {
  const group = requireString(value, 'group', 20);
  if (!/^[А-Яа-яЁёA-Za-z0-9-]+$/.test(group)) {
    throw new HttpError(400, 'Поле "group" содержит недопустимые символы');
  }
  return group;
}

/** Course must be an integer from 1 to 4. */
function parseCourse(value) {
  const course = Number(value);
  if (!Number.isInteger(course) || course < 1 || course > 4) {
    throw new HttpError(400, 'Поле "course" должно быть целым числом от 1 до 4');
  }
  return course;
}

/**
 * Pagination for task 5: limit (10 by default, at most 100) and offset (0 by default).
 * Negative or non-numeric values are rejected with 400 instead of being silently ignored.
 */
function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  let limit = defaultLimit;
  let offset = 0;

  if (query.limit !== undefined) {
    limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
      throw new HttpError(400, `Параметр limit должен быть целым числом от 1 до ${maxLimit}`);
    }
  }

  if (query.offset !== undefined) {
    offset = Number(query.offset);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new HttpError(400, 'Параметр offset должен быть целым числом не меньше 0');
    }
  }

  return { limit, offset };
}

module.exports = { parseId, requireString, parseGroup, parseCourse, parsePagination };
