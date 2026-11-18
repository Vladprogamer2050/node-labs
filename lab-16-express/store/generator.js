'use strict';

const { GROUP, GENRES, GENERATED_BOOKS } = require('../config');

/**
 * Deterministic pseudo random generator (mulberry32).
 * It is seeded with the group number, therefore every start produces exactly
 * the same 100 books (task 5.1: "данные генерируются на основе номера группы").
 */
function createRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Real classics: the examples from the assignment are among them. */
const REAL_BOOKS = [
  { title: 'Война и мир', author: 'Лев Толстой', year: 1869, genre: 'классика' },
  { title: 'Анна Каренина', author: 'Лев Толстой', year: 1878, genre: 'классика' },
  { title: 'Преступление и наказание', author: 'Фёдор Достоевский', year: 1866, genre: 'классика' },
  { title: 'Братья Карамазовы', author: 'Фёдор Достоевский', year: 1880, genre: 'классика' },
  { title: 'Мастер и Маргарита', author: 'Михаил Булгаков', year: 1967, genre: 'роман' },
  { title: 'Собачье сердце', author: 'Михаил Булгаков', year: 1925, genre: 'роман' },
  { title: 'Тихий Дон', author: 'Михаил Шолохов', year: 1940, genre: 'роман' },
  { title: 'Доктор Живаго', author: 'Борис Пастернак', year: 1957, genre: 'роман' },
  { title: 'Один день Ивана Денисовича', author: 'Александр Солженицын', year: 1962, genre: 'роман' },
  { title: 'Пикник на обочине', author: 'Аркадий и Борис Стругацкие', year: 1972, genre: 'фантастика' },
  { title: 'Трудно быть богом', author: 'Аркадий и Борис Стругацкие', year: 1964, genre: 'фантастика' },
  { title: 'Солярис', author: 'Станислав Лем', year: 1961, genre: 'фантастика' },
  { title: 'Дюна', author: 'Фрэнк Герберт', year: 1965, genre: 'фантастика' },
  { title: '1984', author: 'Джордж Оруэлл', year: 1949, genre: 'фантастика' },
  { title: 'Скотный двор', author: 'Джордж Оруэлл', year: 1945, genre: 'роман' },
  { title: 'Убийство в «Восточном экспрессе»', author: 'Агата Кристи', year: 1934, genre: 'детектив' },
  { title: 'Десять негритят', author: 'Агата Кристи', year: 1939, genre: 'детектив' },
  { title: 'Этюд в багровых тонах', author: 'Артур Конан Дойл', year: 1887, genre: 'детектив' },
  { title: 'Властелин колец', author: 'Джон Толкин', year: 1954, genre: 'фэнтези' },
  { title: 'Хоббит, или Туда и обратно', author: 'Джон Толкин', year: 1937, genre: 'фэнтези' },
  { title: 'Гарри Поттер и философский камень', author: 'Джоан Роулинг', year: 1997, genre: 'фэнтези' },
  { title: 'Три товарища', author: 'Эрих Мария Ремарк', year: 1936, genre: 'роман' },
  { title: 'Над пропастью во ржи', author: 'Джером Сэлинджер', year: 1951, genre: 'роман' },
  { title: 'Старик и море', author: 'Эрнест Хемингуэй', year: 1952, genre: 'роман' },
  { title: 'Маленький принц', author: 'Антуан де Сент-Экзюпери', year: 1943, genre: 'классика' },
  { title: 'Сто лет одиночества', author: 'Габриэль Гарсиа Маркес', year: 1967, genre: 'роман' },
  { title: 'Имя розы', author: 'Умберто Эко', year: 1980, genre: 'детектив' },
  { title: 'Парфюмер', author: 'Патрик Зюскинд', year: 1985, genre: 'роман' },
  { title: 'Краткая история времени', author: 'Стивен Хокинг', year: 1988, genre: 'наука' },
  { title: 'Sapiens: краткая история человечества', author: 'Юваль Ной Харари', year: 2011, genre: 'история' },
];

/** Parts used to build realistic titles for the remaining books. */
const ADJECTIVES = [
  'Тёмный', 'Последний', 'Забытый', 'Северный', 'Тихий', 'Стеклянный', 'Железный',
  'Лунный', 'Белый', 'Красный', 'Далёкий', 'Новый', 'Старый', 'Скрытый', 'Вечный',
  'Зимний', 'Огненный', 'Медный', 'Солёный', 'Бархатный',
];

const NOUNS = [
  'город', 'берег', 'сад', 'свет', 'путь', 'дом', 'дождь', 'ветер', 'остров',
  'мост', 'лес', 'снег', 'голос', 'портрет', 'час', 'корабль', 'маяк', 'двор',
  'поезд', 'театр',
];

const GENITIVE_PHRASES = [
  'старого дома', 'тёмного леса', 'северного берега', 'забытого сада',
  'лунного города', 'стеклянного моста', 'тихого двора', 'железного маяка',
];

const TITLE_TEMPLATES = [
  ({ adjective, noun }) => `${adjective} ${noun}`,
  ({ noun }) => `${noun[0].toUpperCase()}${noun.slice(1)} теней`,
  ({ noun }) => `${noun[0].toUpperCase()}${noun.slice(1)} на холме`,
  ({ noun }) => `${noun[0].toUpperCase()}${noun.slice(1)} у моря`,
  ({ noun }) => `${noun[0].toUpperCase()}${noun.slice(1)} без имени`,
  ({ noun }) => `Последний ${noun}`,
  ({ genitive }) => `Тайна ${genitive}`,
  ({ genitive }) => `Письма с ${genitive.replace('старого', 'далёкого').replace('тёмного', 'южного').replace('северного', 'западного')}`,
];

const AUTHOR_SURNAMES = [
  'Волков', 'Громов', 'Ершов', 'Жуков', 'Зимин', 'Ильин', 'Крылов', 'Лебедев',
  'Морозов', 'Нестеров', 'Орлов', 'Поляков', 'Родин', 'Савельев', 'Тихонов',
  'Уваров', 'Фомин', 'Царёв', 'Чернов', 'Шилов', 'Щукин', 'Юдин', 'Яров',
  'Абрамов', 'Белов', 'Воронин', 'Гусев', 'Дроздов', 'Егоров', 'Зайцев',
];

const AUTHOR_INITIALS = ['А. В.', 'Д. С.', 'Е. П.', 'И. Н.', 'К. М.', 'Л. А.', 'М. Ю.', 'О. Г.', 'П. Р.', 'С. Т.'];

const DESCRIPTION_TEMPLATES = [
  'История о людях, которые ищут своё место в меняющемся мире.',
  'Роман о памяти, выборе и цене принятых решений.',
  'Приключенческая история с неожиданной развязкой.',
  'Книга о том, как обычный день может изменить всю жизнь.',
  'Автор размышляет о времени, любви и ответственности.',
  'Напряжённый сюжет и точные детали повседневной жизни.',
  'История взросления и первой самостоятельности.',
  'Атмосферное повествование о месте, которое помнит всё.',
];

/**
 * ISBN-13 check digit: sum of digits with weights 1 and 3, then mod 10.
 * The generated values are valid ISBN-13 codes, so the custom validator and
 * the generator agree with each other.
 */
function isbnCheckDigit(digits) {
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number(digits[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

/** "978-5-478-00001-7" - group-based publisher prefix 478. */
function createIsbn(sequence) {
  const base = `9785${GROUP}${String(sequence).padStart(5, '0')}`;
  return `978-5-${GROUP}-${String(sequence).padStart(5, '0')}-${isbnCheckDigit(base)}`;
}

/** Books are generated from the group number, so the dataset is reproducible. */
function generateBooks(group = GROUP, count = GENERATED_BOOKS) {
  const random = createRandom(Number(group));
  const pick = (items) => items[Math.floor(random() * items.length)];
  const books = [];
  const usedTitles = new Set();

  for (let index = 0; index < count; index += 1) {
    let candidate = REAL_BOOKS[index];

    // After the real books, build unique titles from the templates.
    let guard = 0;
    while (!candidate) {
      guard += 1;
      if (guard > 500) {
        throw new Error('Не удалось сгенерировать уникальные названия книг');
      }

      const title = pick(TITLE_TEMPLATES)({
        adjective: pick(ADJECTIVES),
        noun: pick(NOUNS),
        genitive: pick(GENITIVE_PHRASES),
      });
      const author = `${pick(AUTHOR_SURNAMES)} ${pick(AUTHOR_INITIALS)}`;
      const key = `${title.toLowerCase()}|${author.toLowerCase()}`;

      if (usedTitles.has(key)) continue;

      candidate = {
        title,
        author,
        year: 1950 + Math.floor(random() * 75),
        genre: pick(GENRES),
      };
    }

    usedTitles.add(`${candidate.title.toLowerCase()}|${candidate.author.toLowerCase()}`);

    const totalCopies = 1 + Math.floor(random() * 5);
    const availableCopies = Math.floor(random() * (totalCopies + 1));

    books.push({
      id: index + 1,
      title: candidate.title,
      author: candidate.author,
      year: candidate.year,
      genre: candidate.genre,
      isbn: createIsbn(index + 1),
      description: pick(DESCRIPTION_TEMPLATES),
      totalCopies,
      availableCopies,
      rating: Number((3.5 + random() * 1.5).toFixed(1)),
      createdAt: new Date(Date.UTC(2025, 0, 1) + index * 86400000).toISOString(),
    });
  }

  return books;
}

module.exports = { generateBooks, createIsbn, isbnCheckDigit };
