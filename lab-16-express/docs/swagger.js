'use strict';

const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const { PORT, STUDENT, GENRES } = require('../config');

/**
 * Task 5.5 - the OpenAPI definition.
 * The paths are not written here by hand: swagger-jsdoc collects them from the
 * @openapi annotations in docs/paths.js and merges them with this definition.
 */
const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Library API — Lab 16',
      version: '1.0.0',
      description:
        'REST API библиотеки на Express.js: каталог книг, отзывы, JWT-авторизация, ' +
        'фильтры, пагинация, статистика, CSV-экспорт и импорт, кэширование.',
      contact: {
        name: STUDENT.fullNameRu,
        url: STUDENT.github,
      },
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Локальный сервер' }],
    tags: [
      { name: 'Auth', description: 'Регистрация, вход, текущий пользователь' },
      { name: 'Books', description: 'Каталог книг и отзывы' },
      { name: 'Admin', description: 'Маршруты только для администраторов' },
      { name: 'Service', description: 'Служебные маршруты' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Токен из POST /auth/login, передаётся как "Authorization: Bearer <token>"',
        },
      },
      parameters: {
        BookId: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Идентификатор книги',
          schema: { type: 'integer', minimum: 1, example: 1 },
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Книга с id=999 не найдена' },
            status: { type: 'integer', example: 404 },
            details: {
              type: 'array',
              items: { type: 'string' },
              description: 'Подробности валидации, если есть',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            name: { type: 'string', example: 'Администратор библиотеки' },
            role: { type: 'string', enum: ['admin', 'reader'], example: 'admin' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Война и мир' },
            author: { type: 'string', example: 'Лев Толстой' },
            year: { type: 'integer', example: 1869 },
            genre: { type: 'string', enum: GENRES, example: 'классика' },
            isbn: { type: 'string', example: '978-5-478-00001-7' },
            description: { type: 'string' },
            totalCopies: { type: 'integer', example: 4 },
            availableCopies: { type: 'integer', example: 2 },
            rating: { type: 'number', format: 'float', example: 4.7 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        BookInput: {
          type: 'object',
          required: ['title', 'author', 'year', 'genre'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200, example: 'Мастер и Маргарита' },
            author: { type: 'string', minLength: 1, maxLength: 120, example: 'Михаил Булгаков' },
            year: { type: 'integer', minimum: 1000, maximum: 2100, example: 1967 },
            genre: { type: 'string', enum: GENRES, example: 'роман' },
            isbn: {
              type: 'string',
              description: 'ISBN-13; при отсутствии генерируется автоматически',
              example: '978-5-478-00101-3',
            },
            description: { type: 'string', maxLength: 1000 },
            totalCopies: { type: 'integer', minimum: 1, maximum: 100, default: 1 },
            availableCopies: { type: 'integer', minimum: 0, maximum: 100 },
            rating: { type: 'number', minimum: 0, maximum: 5, default: 0 },
          },
        },
        BookUpdate: {
          type: 'object',
          description: 'Любое подмножество полей книги; пустое тело отклоняется',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            author: { type: 'string', minLength: 1, maxLength: 120 },
            year: { type: 'integer', minimum: 1000, maximum: 2100 },
            genre: { type: 'string', enum: GENRES },
            isbn: { type: 'string' },
            description: { type: 'string', maxLength: 1000 },
            totalCopies: { type: 'integer', minimum: 1, maximum: 100 },
            availableCopies: { type: 'integer', minimum: 0, maximum: 100 },
            rating: { type: 'number', minimum: 0, maximum: 5 },
          },
        },
        ReviewInput: {
          type: 'object',
          required: ['rating', 'comment'],
          properties: {
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: {
              type: 'string',
              minLength: 3,
              maxLength: 1000,
              example: 'Одна из лучших книг, которые я читал.',
            },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            bookId: { type: 'integer', example: 1 },
            userId: { type: 'integer', example: 2 },
            userName: { type: 'string', example: 'Читатель Библиотеки' },
            rating: { type: 'integer', example: 5 },
            comment: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'student@example.com' },
            password: { type: 'string', minLength: 6, maxLength: 72, example: 'Student123!' },
            name: { type: 'string', minLength: 2, maxLength: 80, example: 'Новый читатель' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@example.com' },
            password: { type: 'string', example: 'Admin123!' },
          },
        },
      },
      responses: {
        ValidationError: {
          description: 'Некорректные данные',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Unauthorized: {
          description: 'Требуется авторизация',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Forbidden: {
          description: 'Недостаточно прав',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'Объект не найден',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Conflict: {
          description: 'Конфликт: дубликат или занятый ISBN',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  apis: [path.join(__dirname, 'paths.js')],
};

module.exports = swaggerJsdoc(options);
