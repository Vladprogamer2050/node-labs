'use strict';

/**
 * Lab 14 - shared configuration.
 * Variant (journal number) = 7.
 */
const path = require('path');

const VARIANT = 7;

const STUDENT = {
  fullName: 'Evdokimov Vladislav Evgenievich',
  fullNameRu: 'Евдокимов Владислав Евгеньевич',
  group: '478',
};

const FAVORITE_BOOKS = [
  'The Master and Margarita - M. Bulgakov',
  'Crime and Punishment - F. Dostoevsky',
  '1984 - G. Orwell',
  'The Witcher: The Last Wish - A. Sapkowski',
  'Dune - F. Herbert',
];

/** All task artefacts live under lab-14-fs/workspace (relative to the current directory). */
const WORKSPACE = path.join('lab-14-fs', 'workspace');

module.exports = { VARIANT, STUDENT, FAVORITE_BOOKS, WORKSPACE };
