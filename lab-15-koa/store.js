'use strict';

/**
 * Lab 15 - in-memory data store.
 *
 * Users (task 2) start with a single record, students (tasks 4-5) are generated
 * from the group number when the server starts. Nothing is persisted on purpose:
 * the lab is about Koa, not about a database. The generator is seeded with the
 * group number, so every start produces exactly the same 50 students.
 *
 * Validation lives in the routes (lib/validation.js); the store only mutates data.
 */
const { GROUP, GROUP_CODES } = require('./config');

const MALE_FIRST_NAMES = [
  'Александр', 'Алексей', 'Андрей', 'Борис', 'Вадим', 'Василий', 'Виктор', 'Георгий',
  'Денис', 'Дмитрий', 'Евгений', 'Иван', 'Игорь', 'Илья', 'Кирилл', 'Лев',
  'Максим', 'Михаил', 'Никита', 'Олег', 'Павел', 'Роман', 'Сергей', 'Степан',
  'Тимофей', 'Фёдор', 'Ярослав',
];

const FEMALE_FIRST_NAMES = [
  'Анна', 'Анастасия', 'Валерия', 'Вера', 'Галина', 'Дарья', 'Екатерина', 'Елена',
  'Ирина', 'Ксения', 'Людмила', 'Марина', 'Наталья', 'Ольга', 'Полина', 'Светлана',
  'София', 'Татьяна', 'Юлия',
];

const LAST_NAMES = [
  'Иванов', 'Смирнов', 'Кузнецов', 'Попов', 'Васильев', 'Петров', 'Соколов', 'Михайлов',
  'Новиков', 'Фёдоров', 'Морозов', 'Волков', 'Алексеев', 'Лебедев', 'Семёнов', 'Егоров',
  'Павлов', 'Козлов', 'Степанов', 'Николаев', 'Орлов', 'Андреев', 'Макаров', 'Никитин',
  'Захаров', 'Зайцев', 'Соловьёв', 'Борисов', 'Яковлев', 'Григорьев', 'Романов', 'Воробьёв',
  'Сергеев', 'Кузьмин', 'Фролов', 'Александров', 'Дмитриев', 'Королёв', 'Гусев', 'Киселёв',
];

/** Deterministic pseudo random generator (mulberry32): the same data on every start. */
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

/** "Смирнов" -> "Смирнова"; surnames of another form are left as is. */
function toFemaleLastName(lastName) {
  return /(ов|ев|ёв|ин)$/.test(lastName) ? `${lastName}а` : lastName;
}

const random = createRandom(Number(GROUP));
const pick = (items) => items[Math.floor(random() * items.length)];

/** Task 2 - users for the CRUD API. */
const users = [{ id: 1, name: 'Иванов Иван', group: GROUP }];
let nextUserId = 2;

/** Tasks 4-5 - 50 students generated from the group number. */
const students = [];
let nextStudentId = 1;

for (let index = 0; index < 50; index += 1) {
  const lastName = pick(LAST_NAMES);
  const isFemale = random() < 0.5;
  const firstName = isFemale ? pick(FEMALE_FIRST_NAMES) : pick(MALE_FIRST_NAMES);

  students.push({
    id: nextStudentId,
    name: `${isFemale ? toFemaleLastName(lastName) : lastName} ${firstName}`,
    group: GROUP_CODES[index % GROUP_CODES.length],
    course: 1 + Math.floor(random() * 4),
  });
  nextStudentId += 1;
}

/* ------------------------------- users ---------------------------------- */

function listUsers() {
  return users;
}

function findUser(id) {
  return users.find((user) => user.id === id);
}

function createUser({ name, group }) {
  const user = { id: nextUserId, name, group };
  nextUserId += 1;
  users.push(user);
  return user;
}

function updateUser(id, { name, group }) {
  const user = findUser(id);
  user.name = name;
  user.group = group;
  return user;
}

function deleteUser(id) {
  const index = users.findIndex((user) => user.id === id);
  const [removed] = users.splice(index, 1);
  return removed;
}

/* ------------------------------ students -------------------------------- */

function listStudents() {
  return students;
}

function findStudent(id) {
  return students.find((student) => student.id === id);
}

function createStudent({ name, group, course }) {
  const student = { id: nextStudentId, name, group, course };
  nextStudentId += 1;
  students.push(student);
  return student;
}

function updateStudent(id, patch) {
  const student = findStudent(id);
  Object.assign(student, patch);
  return student;
}

function deleteStudent(id) {
  const index = students.findIndex((student) => student.id === id);
  const [removed] = students.splice(index, 1);
  return removed;
}

module.exports = {
  listUsers,
  findUser,
  createUser,
  updateUser,
  deleteUser,
  listStudents,
  findStudent,
  createStudent,
  updateStudent,
  deleteStudent,
};
