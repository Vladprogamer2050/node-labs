'use strict';

const express = require('express');
const store = require('../store');
const { HttpError } = require('../lib/http-error');
const { authenticate, requireRole } = require('../middleware/auth');
const { logOperation } = require('../lib/operation-log');
const booksCache = require('../lib/books-cache');
const { toCsv, parseCsv } = require('../lib/csv');
const {
  validate,
  parseId,
  bookCreateSchema,
  bookUpdateSchema,
  reviewSchema,
  listQuerySchema,
  availableQuerySchema,
  recommendationsQuerySchema,
  searchQuerySchema,
  exportQuerySchema,
} = require('../lib/validation');

const router = express.Router();

/** Task 5.2 - every book route requires a JWT. */
router.use(authenticate);

/* ------------------------------ helpers --------------------------------- */

function sortBooks(items, sort) {
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  const direction = descending ? -1 : 1;

  return [...items].sort((a, b) => {
    if (field === 'year' || field === 'rating') {
      return (a[field] - b[field]) * direction;
    }
    return a[field].localeCompare(b[field], 'ru') * direction;
  });
}

function applyFilters(items, query) {
  let result = items;

  // Task 4.1 - filter by author, exact year and a year range.
  if (query.author) {
    const needle = query.author.toLowerCase();
    result = result.filter((book) => book.author.toLowerCase().includes(needle));
  }
  if (query.genre) {
    result = result.filter((book) => book.genre === query.genre);
  }
  if (query.year !== undefined) {
    result = result.filter((book) => book.year === query.year);
  }
  if (query.yearFrom !== undefined) {
    result = result.filter((book) => book.year >= query.yearFrom);
  }
  if (query.yearTo !== undefined) {
    result = result.filter((book) => book.year <= query.yearTo);
  }

  // Task 4.1 - search by title or author.
  if (query.search) {
    const needle = query.search.toLowerCase();
    result = result.filter(
      (book) =>
        book.title.toLowerCase().includes(needle) || book.author.toLowerCase().includes(needle)
    );
  }

  return result;
}

function assertCopies(availableCopies, totalCopies) {
  if (availableCopies > totalCopies) {
    throw new HttpError(400, 'Поле "availableCopies" не может быть больше "totalCopies"');
  }
}

/** Shared creation logic for POST /api/books and the CSV import. */
function addBook(data) {
  const duplicate = store.findDuplicate(data.title, data.author);
  if (duplicate) {
    throw new HttpError(409, `Книга с таким названием и автором уже есть (id=${duplicate.id})`, [
      'Проверка на дубликаты выполняется по названию и автору',
    ]);
  }

  const totalCopies = data.totalCopies;
  const availableCopies = data.availableCopies ?? totalCopies;
  assertCopies(availableCopies, totalCopies);

  const isbn = data.isbn || store.generateUniqueIsbn();
  if (store.listBooks().some((book) => book.isbn === isbn)) {
    throw new HttpError(409, `Книга с ISBN ${isbn} уже есть`);
  }

  return store.createBook({
    title: data.title,
    author: data.author,
    year: data.year,
    genre: data.genre,
    isbn,
    description: data.description || '',
    totalCopies,
    availableCopies,
    rating: data.rating,
  });
}

/* --------------------------- task 2 / task 4 ---------------------------- */

/**
 * Task 2.6 - search by author (the simplified endpoint from task 2).
 * Task 4 uses the more general "search" parameter of the list endpoint.
 */
router.get('/search', booksCache, (req, res) => {
  const query = validate(searchQuerySchema, req.query);
  const needle = query.author.toLowerCase();
  const data = store
    .listBooks()
    .filter((book) => book.author.toLowerCase().includes(needle))
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  res.json({ author: query.author, total: data.length, data });
});

/** Task 4.6 - statistics: totals, authors, genres, oldest/newest year. */
router.get('/stats', booksCache, (req, res) => {
  res.json(store.getStatistics());
});

/** Task 5.4 - export the whole catalogue as CSV or JSON. */
router.get('/export', (req, res, next) => {
  try {
    const { format } = validate(exportQuerySchema, req.query);
    const books = store.listBooks();

    logOperation('EXPORT_BOOKS', { user: req.user.email, details: `format=${format} count=${books.length}` });

    if (format === 'json') {
      res.set('Content-Disposition', 'attachment; filename="books-export.json"');
      return res.json(books);
    }

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="books-export.csv"');
    return res.send(toCsv(books));
  } catch (error) {
    return next(error);
  }
});

/**
 * Task 5.4 - import books from a CSV file.
 * The file is sent as the request body with Content-Type: text/csv, so no
 * multipart parser is required. Invalid rows are reported line by line and do
 * not abort the whole import.
 */
router.post('/import', requireRole('admin'), async (req, res) => {
  if (typeof req.body !== 'string' || req.body.trim() === '') {
    throw new HttpError(
      400,
      'Ожидается CSV в теле запроса: Content-Type: text/csv, тело — содержимое файла'
    );
  }

  const rows = parseCsv(req.body);
  if (rows.length === 0) {
    throw new HttpError(400, 'CSV не содержит строк с данными');
  }

  const imported = [];
  const errors = [];
  let skipped = 0;

  rows.forEach((row, index) => {
    const line = index + 2; // +1 header, +1 because lines are 1-based

    try {
      const data = validate(bookCreateSchema, row, `Строка ${line}`);
      const book = addBook(data);
      imported.push(book);
      logOperation('IMPORT_BOOK', { user: req.user.email, bookId: book.id, details: book.title });
    } catch (error) {
      skipped += 1;
      const reason = error.details && error.details.length
        ? `${error.message}: ${error.details.join('; ')}`
        : error.message;
      errors.push({ line, message: reason, details: error.details || null });
    }
  });

  booksCache.clear();
  await logOperation('IMPORT_CSV', {
    user: req.user.email,
    details: `imported=${imported.length} skipped=${skipped}`,
  });

  const status = imported.length === 0 && errors.length > 0 ? 400 : 200;
  res.status(status).json({ imported: imported.length, skipped, errors, data: imported });
});

/** Task 5.4 - recommendations by genre, best rated first. */
router.get('/recommendations', booksCache, (req, res) => {
  const query = validate(recommendationsQuerySchema, req.query);

  const matching = store
    .listBooks()
    .filter((book) => book.genre === query.genre)
    .sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title, 'ru'));

  const data = matching.slice(0, query.limit);
  res.json({ genre: query.genre, total: matching.length, count: data.length, data });
});

/** Task 5.4 - books that readers can take right now. */
router.get('/available', booksCache, (req, res) => {
  const query = validate(availableQuerySchema, req.query);

  let matching = store.listBooks().filter((book) => book.availableCopies > 0);
  if (query.genre) {
    matching = matching.filter((book) => book.genre === query.genre);
  }
  matching.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  const data = matching.slice(0, query.limit);
  res.json({ total: matching.length, count: data.length, data });
});

/**
 * Task 2.1 / 4.1 - list with filtering, search, sorting and pagination.
 *
 *   /api/books?author=Толстой&yearFrom=1800&yearTo=1900
 *   /api/books?genre=фантастика&sort=-year&limit=5&page=2
 *   /api/books?search=война
 */
router.get('/', booksCache, (req, res) => {
  const query = validate(listQuerySchema, req.query);

  if (query.yearFrom !== undefined && query.yearTo !== undefined && query.yearFrom > query.yearTo) {
    throw new HttpError(400, 'Параметр yearFrom не может быть больше yearTo');
  }

  const items = applyFilters(store.listBooks(), query);
  const sorted = sortBooks(items, query.sort);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const start = (query.page - 1) * query.limit;
  const data = sorted.slice(start, start + query.limit);

  res.json({
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    count: data.length,
    data,
  });
});

/** Task 2.2 / 5.3 - one book with its reader reviews. */
router.get('/:id', booksCache, (req, res) => {
  const id = parseId(req.params.id, 'книги');
  const book = store.findBook(id);

  if (!book) {
    throw new HttpError(404, `Книга с id=${id} не найдена`);
  }

  res.json({ ...book, reviews: store.listReviews(id) });
});

/** Task 2.3 / 5.3 - creating a book is allowed to administrators only. */
router.post('/', requireRole('admin'), async (req, res) => {
  const data = validate(bookCreateSchema, req.body || {});
  const book = addBook(data);

  booksCache.clear();
  await logOperation('CREATE_BOOK', { user: req.user.email, bookId: book.id, details: book.title });

  res.status(201).json(book);
});

/** Task 2.4 - updating a book: only the passed fields change. */
router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id, 'книги');
  const book = store.findBook(id);

  if (!book) {
    throw new HttpError(404, `Книга с id=${id} не найдена`);
  }

  const patch = validate(bookUpdateSchema, req.body || {});

  const nextTitle = patch.title ?? book.title;
  const nextAuthor = patch.author ?? book.author;
  const duplicate = store.findDuplicate(nextTitle, nextAuthor, id);
  if (duplicate) {
    throw new HttpError(409, `Книга с таким названием и автором уже есть (id=${duplicate.id})`);
  }

  if (patch.isbn && patch.isbn !== book.isbn) {
    if (store.listBooks().some((other) => other.id !== id && other.isbn === patch.isbn)) {
      throw new HttpError(409, `Книга с ISBN ${patch.isbn} уже есть`);
    }
  }

  const nextTotal = patch.totalCopies ?? book.totalCopies;
  const nextAvailable = patch.availableCopies ?? book.availableCopies;
  assertCopies(nextAvailable, nextTotal);

  Object.assign(book, patch);
  booksCache.clear();
  await logOperation('UPDATE_BOOK', { user: req.user.email, bookId: id, details: book.title });

  res.json(book);
});

/** Task 2.5 / 5.3 - deleting a book is allowed to administrators only. */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const id = parseId(req.params.id, 'книги');
  const book = store.findBook(id);

  if (!book) {
    throw new HttpError(404, `Книга с id=${id} не найдена`);
  }

  store.deleteBook(id);
  booksCache.clear();
  await logOperation('DELETE_BOOK', { user: req.user.email, bookId: id, details: book.title });

  res.json({ message: `Книга с id=${id} удалена`, book });
});

/** Task 5.3 - a reader can add a review; it appears in GET /api/books/:id. */
router.post('/:id/reviews', async (req, res) => {
  const id = parseId(req.params.id, 'книги');
  const book = store.findBook(id);

  if (!book) {
    throw new HttpError(404, `Книга с id=${id} не найдена`);
  }

  const data = validate(reviewSchema, req.body || {});
  const review = store.createReview(id, req.user, data);

  booksCache.clear();
  await logOperation('ADD_REVIEW', {
    user: req.user.email,
    bookId: id,
    details: `rating=${review.rating}`,
  });

  res.status(201).json(review);
});

module.exports = router;
