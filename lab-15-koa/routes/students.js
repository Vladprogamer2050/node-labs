'use strict';

const Router = require('@koa/router');
const store = require('../store');
const { HttpError } = require('../lib/http-error');
const {
  parseId,
  requireString,
  parseGroup,
  parseCourse,
  parsePagination,
} = require('../lib/validation');

const router = new Router({ prefix: '/students' });
const SORTABLE_FIELDS = ['id', 'name', 'group', 'course'];

/**
 * Task 5.3 - sorting.
 * sort=name / sort=-name (descending) / sort=course / sort=-id ...
 * An unknown field is a client error, so 400 instead of ignoring it.
 */
function applySort(items, sort) {
  if (!sort) return items;

  const value = String(sort);
  const descending = value.startsWith('-');
  const field = descending ? value.slice(1) : value;

  if (!SORTABLE_FIELDS.includes(field)) {
    throw new HttpError(
      400,
      `Неизвестное поле сортировки "${field}". Доступны: ${SORTABLE_FIELDS.join(', ')}`
    );
  }

  const direction = descending ? -1 : 1;
  return [...items].sort((a, b) => {
    if (field === 'id' || field === 'course') return (a[field] - b[field]) * direction;
    return a[field].localeCompare(b[field], 'ru') * direction;
  });
}

/**
 * Tasks 4 and 5 - list with filtering, search, sorting and pagination.
 *
 *   /students?group=478-1
 *   /students?search=Ан
 *   /students?sort=-course&limit=5&offset=10
 *
 * The response always contains the total number of matches, so the client can
 * build pagination controls.
 */
router.get('/', (ctx) => {
  const { group, search, sort } = ctx.query;
  const { limit, offset } = parsePagination(ctx.query);

  let items = store.listStudents();

  // Task 4.2 - filter by group; an unknown group simply gives an empty array.
  if (group) {
    const needle = String(group).toLowerCase();
    items = items.filter((student) => student.group.toLowerCase() === needle);
  }

  // Task 5.4 - case-insensitive search over the full name.
  if (search) {
    const needle = String(search).trim().toLowerCase();
    items = items.filter((student) => student.name.toLowerCase().includes(needle));
  }

  items = applySort(items, sort);

  const total = items.length;
  const page = items.slice(offset, offset + limit);

  ctx.body = { total, limit, offset, count: page.length, data: page };
});

/** Task 4.3 - a single student, 404 when it does not exist. */
router.get('/:id', (ctx) => {
  const id = parseId(ctx.params.id, 'студента');
  const student = store.findStudent(id);

  if (!student) {
    throw new HttpError(404, `Студент с id=${id} не найден`);
  }
  ctx.body = student;
});

/** Task 4.4 / 5.5 - create with validation of every required field. */
router.post('/', (ctx) => {
  const body = ctx.request.body || {};

  const student = store.createStudent({
    name: requireString(body.name, 'name', 80),
    group: parseGroup(body.group),
    course: parseCourse(body.course),
  });

  ctx.status = 201;
  ctx.body = student;
});

/** Task 4.5 - partial update: only the passed fields are validated and changed. */
router.put('/:id', (ctx) => {
  const id = parseId(ctx.params.id, 'студента');
  if (!store.findStudent(id)) {
    throw new HttpError(404, `Студент с id=${id} не найден`);
  }

  const body = ctx.request.body || {};
  const patch = {};

  if (body.name !== undefined) patch.name = requireString(body.name, 'name', 80);
  if (body.group !== undefined) patch.group = parseGroup(body.group);
  if (body.course !== undefined) patch.course = parseCourse(body.course);

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, 'Нужно передать хотя бы одно поле: name, group или course');
  }

  ctx.body = store.updateStudent(id, patch);
});

/** Task 4.6 - delete. */
router.delete('/:id', (ctx) => {
  const id = parseId(ctx.params.id, 'студента');
  const student = store.findStudent(id);

  if (!student) {
    throw new HttpError(404, `Студент с id=${id} не найден`);
  }

  store.deleteStudent(id);
  ctx.body = { message: `Студент с id=${id} удалён`, student };
});

module.exports = router;
