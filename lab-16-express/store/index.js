'use strict';

const bcrypt = require('bcryptjs');
const { generateBooks, createIsbn } = require('./generator');

/**
 * In-memory data store for lab 16.
 *
 * The 100 books are generated when the process starts (task 5.1); users,
 * reviews and later changes live in memory as well. The lab is about Express,
 * so nothing is persisted in a database: restarting the server restores the
 * initial dataset.
 */
const books = generateBooks();
const users = [];
const reviews = [];

let nextBookId = books.length + 1;
let nextReviewId = 1;
let nextUserId = 1;
let nextIsbnSequence = 1000;

/**
 * Two demo accounts are created on every start, so the JWT flow can be shown
 * immediately. Passwords are hashed with bcrypt even in memory.
 */
for (const account of [
  { email: 'admin@example.com', name: 'Администратор библиотеки', password: 'Admin123!', role: 'admin' },
  { email: 'reader@example.com', name: 'Читатель Библиотеки', password: 'Reader123!', role: 'reader' },
]) {
  users.push({
    id: nextUserId,
    email: account.email,
    name: account.name,
    role: account.role,
    passwordHash: bcrypt.hashSync(account.password, 10),
    createdAt: new Date().toISOString(),
  });
  nextUserId += 1;
}

/* -------------------------------- books --------------------------------- */

function listBooks() {
  return books;
}

function findBook(id) {
  return books.find((book) => book.id === id);
}

/**
 * ISBN for a book created through the API without one.
 * The sequence continues after the generated catalogue and skips values that
 * are already taken, so the ISBN stays unique.
 */
function generateUniqueIsbn() {
  let isbn;

  do {
    nextIsbnSequence += 1;
    isbn = createIsbn(nextIsbnSequence);
  } while (books.some((book) => book.isbn === isbn));

  return isbn;
}

/** Task 4 - duplicate check by title and author, ignoring case and spaces. */
function findDuplicate(title, author, excludeId = null) {
  const normalizedTitle = String(title).trim().toLowerCase();
  const normalizedAuthor = String(author).trim().toLowerCase();

  return books.find(
    (book) =>
      book.id !== excludeId &&
      book.title.toLowerCase() === normalizedTitle &&
      book.author.toLowerCase() === normalizedAuthor
  );
}

function createBook(data) {
  const book = {
    id: nextBookId,
    ...data,
    createdAt: new Date().toISOString(),
  };
  nextBookId += 1;
  books.push(book);
  return book;
}

function updateBook(id, patch) {
  const book = findBook(id);
  Object.assign(book, patch);
  return book;
}

function deleteBook(id) {
  const index = books.findIndex((book) => book.id === id);
  const [removed] = books.splice(index, 1);
  return removed;
}

/* ------------------------------- reviews -------------------------------- */

function listReviews(bookId) {
  return reviews
    .filter((review) => review.bookId === bookId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function createReview(bookId, user, { rating, comment }) {
  const review = {
    id: nextReviewId,
    bookId,
    userId: user.id,
    userName: user.name,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  nextReviewId += 1;
  reviews.push(review);
  return review;
}

/* -------------------------------- users --------------------------------- */

function listUsers() {
  return users;
}

function findUserByEmail(email) {
  const needle = String(email).trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === needle);
}

function findUserById(id) {
  return users.find((user) => user.id === id);
}

function createUser({ email, name, password, role = 'reader' }) {
  const user = {
    id: nextUserId,
    email: email.trim().toLowerCase(),
    name,
    role,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };
  nextUserId += 1;
  users.push(user);
  return user;
}

/** Public user representation: the password hash never leaves the store. */
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/* ------------------------------- statistics ----------------------------- */

/** Task 4.6 - library statistics. */
function getStatistics() {
  const byAuthor = new Map();
  const byGenre = new Map();
  let totalCopies = 0;
  let availableCopies = 0;
  let ratingSum = 0;

  for (const book of books) {
    byAuthor.set(book.author, (byAuthor.get(book.author) || 0) + 1);
    byGenre.set(book.genre, (byGenre.get(book.genre) || 0) + 1);
    totalCopies += book.totalCopies;
    availableCopies += book.availableCopies;
    ratingSum += book.rating;
  }

  const years = books.map((book) => book.year);
  const sortCounts = (map) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));

  return {
    totalBooks: books.length,
    totalCopies,
    availableCopies,
    borrowedCopies: totalCopies - availableCopies,
    averageRating: books.length ? Number((ratingSum / books.length).toFixed(2)) : 0,
    oldestYear: books.length ? Math.min(...years) : null,
    newestYear: books.length ? Math.max(...years) : null,
    byAuthor: sortCounts(byAuthor),
    byGenre: sortCounts(byGenre),
    totalUsers: users.length,
    totalReviews: reviews.length,
  };
}

module.exports = {
  listBooks,
  findBook,
  findDuplicate,
  generateUniqueIsbn,
  createBook,
  updateBook,
  deleteBook,
  listReviews,
  createReview,
  listUsers,
  findUserByEmail,
  findUserById,
  createUser,
  toPublicUser,
  getStatistics,
};
