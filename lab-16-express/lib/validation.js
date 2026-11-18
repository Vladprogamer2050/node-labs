'use strict';

const Joi = require('joi');
const { GENRES } = require('../config');
const { HttpError } = require('./http-error');

/**
 * Validation with Joi (task 5.6).
 *
 * Every schema strips unknown fields, so a client cannot inject extra
 * properties into a stored object, and all messages are in Russian like the
 * rest of the console output.
 */
const RU_MESSAGES = {
  'any.required': 'Поле {{#label}} обязательно',
  'any.only': 'Поле {{#label}} должно быть одним из допустимых значений',
  'string.base': 'Поле {{#label}} должно быть строкой',
  'string.empty': 'Поле {{#label}} не может быть пустым',
  'string.min': 'Поле {{#label}} короче {{#limit}} символов',
  'string.max': 'Поле {{#label}} длиннее {{#limit}} символов',
  'string.email': 'Поле {{#label}} должно быть корректным email',
  'string.pattern.base': 'Поле {{#label}} имеет неверный формат',
  'number.base': 'Поле {{#label}} должно быть числом',
  'number.integer': 'Поле {{#label}} должно быть целым числом',
  'number.min': 'Поле {{#label}} меньше {{#limit}}',
  'number.max': 'Поле {{#label}} больше {{#limit}}',
  'object.min': 'Нужно передать хотя бы одно поле',
};

/**
 * ISBN-13: 13 digits with weights 1 and 3 and a valid check digit.
 * The generated books pass this check, so exported CSV can be imported back.
 */
function isValidIsbn(value) {
  const digits = String(value).replace(/-/g, '');
  if (!/^(978|979)\d{10}$/.test(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(digits[index]) * (index % 2 === 0 ? 1 : 3);
  }

  return Number(digits[12]) === (10 - (sum % 10)) % 10;
}

const isbnSchema = Joi.string()
  .trim()
  .custom((value, helpers) => (isValidIsbn(value) ? value : helpers.error('string.isbn')), 'ISBN-13')
  .messages({
    'string.isbn': 'Поле "isbn" должно быть корректным ISBN-13 с верной контрольной суммой',
  });

function bookFields({ withDefaults }) {
  const totalCopies = Joi.number().integer().min(1).max(100);
  const rating = Joi.number().min(0).max(5);

  return {
    title: Joi.string().trim().min(1).max(200).required(),
    author: Joi.string().trim().min(1).max(120).required(),
    year: Joi.number().integer().min(1000).max(2100).required(),
    genre: Joi.string()
      .valid(...GENRES)
      .required(),
    isbn: isbnSchema.optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
    totalCopies: withDefaults ? totalCopies.default(1) : totalCopies.optional(),
    availableCopies: Joi.number().integer().min(0).max(100).optional(),
    rating: withDefaults ? rating.default(0) : rating.optional(),
  };
}

const bookCreateSchema = Joi.object(bookFields({ withDefaults: true }));
const bookUpdateSchema = Joi.object(bookFields({ withDefaults: false }))
  .fork(['title', 'author', 'year', 'genre'], (field) => field.optional())
  .min(1);

const reviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(3).max(1000).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: false }).max(120).required(),
  password: Joi.string().min(6).max(72).required(),
  name: Joi.string().trim().min(2).max(80).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: false }).max(120).required(),
  password: Joi.string().min(1).max(72).required(),
});

const listQuerySchema = Joi.object({
  author: Joi.string().trim().max(120),
  year: Joi.number().integer().min(1000).max(2100),
  yearFrom: Joi.number().integer().min(1000).max(2100),
  yearTo: Joi.number().integer().min(1000).max(2100),
  genre: Joi.string().valid(...GENRES),
  search: Joi.string().trim().max(120),
  limit: Joi.number().integer().min(1).max(100).default(10),
  page: Joi.number().integer().min(1).default(1),
  sort: Joi.string()
    .trim()
    .pattern(/^-?(title|author|year|rating)$/)
    .default('title'),
});

const availableQuerySchema = Joi.object({
  genre: Joi.string().valid(...GENRES),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const recommendationsQuerySchema = Joi.object({
  genre: Joi.string()
    .valid(...GENRES)
    .required(),
  limit: Joi.number().integer().min(1).max(50).default(5),
});

const searchQuerySchema = Joi.object({
  author: Joi.string().trim().min(1).max(120).required(),
});

const exportQuerySchema = Joi.object({
  format: Joi.string().valid('csv', 'json').default('csv'),
});

const logsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(20),
});

/** Validate and normalize a value, otherwise 400 with the list of problems. */
function validate(schema, value, message = 'Некорректные данные') {
  const { error, value: validated } = schema.validate(value, {
    abortEarly: false,
    convert: true,
    stripUnknown: true,
    messages: RU_MESSAGES,
  });

  if (error) {
    throw new HttpError(400, message, error.details.map((detail) => detail.message));
  }

  return validated;
}

/** Route id must be a positive integer, otherwise 400. */
function parseId(value, entity = 'объекта') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, `Некорректный id ${entity}: ${value}`);
  }
  return id;
}

module.exports = {
  isValidIsbn,
  bookCreateSchema,
  bookUpdateSchema,
  reviewSchema,
  registerSchema,
  loginSchema,
  listQuerySchema,
  availableQuerySchema,
  recommendationsQuerySchema,
  searchQuerySchema,
  exportQuerySchema,
  logsQuerySchema,
  validate,
  parseId,
};
