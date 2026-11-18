'use strict';

/**
 * CSV helpers for task 5: export the catalogue and import it back.
 *
 * The export starts with a BOM, so Excel opens Cyrillic text correctly; the
 * parser removes the BOM before reading the header. Cells with commas, quotes
 * or line breaks are quoted as usual (RFC 4180).
 */
const COLUMNS = [
  'id',
  'title',
  'author',
  'year',
  'genre',
  'isbn',
  'totalCopies',
  'availableCopies',
  'rating',
  'description',
];

function escapeCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(books) {
  const lines = [COLUMNS.join(',')];
  for (const book of books) {
    lines.push(COLUMNS.map((column) => escapeCell(book[column])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Minimal RFC 4180 parser: quotes, escaped quotes, CRLF and LF. */
function parseCsv(text) {
  const content = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const nonEmpty = rows.filter((cells) => cells.some((value) => value.trim() !== ''));
  if (nonEmpty.length === 0) return [];

  const header = nonEmpty[0].map((name) => name.trim().toLowerCase());
  return nonEmpty.slice(1).map((cells) =>
    Object.fromEntries(header.map((name, index) => [name, (cells[index] ?? '').trim()]))
  );
}

module.exports = { toCsv, parseCsv, COLUMNS };
