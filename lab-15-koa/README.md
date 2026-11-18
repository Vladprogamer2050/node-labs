# Lab 15 — Simple server on Koa.js

**Student:** Evdokimov Vladislav Evgenievich (Евдокимов Владислав Евгеньевич)
**Group:** 478
**Journal number (variant):** 7

## Common requirements and how they are met

| Requirement (from the assignment) | Implementation |
|---|---|
| HTTP server on port 3000 | `server.js` listens on `PORT` (`3000` by default) |
| Framework Koa.js | `koa` 3.3, `@koa/router` 15.7, `koa-bodyparser` 4.4 |
| Every task level is implemented | tasks 1–5 live in `routes/` and `middleware/` |
| Clean, commented code | JSDoc comments in every module, identifiers and comments in English |
| JSON errors instead of HTML pages | `middleware/error-handler.js` plus a JSON 404 fallback in `app.js` |
| Validation of all input | `lib/validation.js` (`id`, `name`, `group`, `course`, `limit`, `offset`, `sort`) |
| Data is not lost on a failed request | a record is changed only after the whole body has been validated |

## Layout

```
lab-15-koa/
├── app.js                     # Koa application: middleware order and routers
├── server.js                  # entry point, graceful shutdown, EADDRINUSE message
├── config.js                  # port, student data, group codes
├── store.js                   # in-memory users and 50 generated students
├── lib/
│   ├── format.js              # log timestamps, Russian date, token masking
│   ├── http-error.js          # error with an HTTP status
│   └── validation.js          # id / name / group / course / pagination parsers
├── middleware/
│   ├── logger.js              # task 3.1 — request logging
│   ├── error-handler.js       # task 3.2 — JSON error responses
│   └── auth.js                # task 3.3 — Authorization header check
└── routes/
    ├── index.js               # task 1 — HTML page
    ├── users.js               # task 2 — /api/users CRUD
    ├── debug.js               # tasks 3.3–3.4 — /protected and /error
    └── students.js            # tasks 4–5 — /students API
```

## Run

```bash
cd lab-15-koa
npm install
npm start
```

The page is available at `http://localhost:3000/`. Another port can be used
without touching the code:

```bash
$env:PORT=4000; npm start     # PowerShell
PORT=4000 npm start           # bash
```

All data is kept in memory and is regenerated on every start, therefore the
console screenshots can be reproduced exactly.

## Task 1 — HTML page

`GET /` returns a page rendered on every request (the time is always current):

* the title "Лабораторная работа №15";
* student full name and group 478;
* current date and time in the `DD.MM.YYYY HH:MM:SS` format;
* a short greeting ("Добро пожаловать!") and a list of the available routes.

The styles are inline, so the page does not depend on external files, fonts or
CDNs and works offline.

## Task 2 — users CRUD API

| Method | Path | Result |
|---|---|---|
| GET | `/api/users` | `200`, array of users |
| GET | `/api/users/:id` | `200` user, `404` if it does not exist |
| POST | `/api/users` | `201`, created user with the id assigned by the server |
| PUT | `/api/users/:id` | `200`, updated user, `404` if it does not exist |
| DELETE | `/api/users/:id` | `200`, `{"message": "...", "user": {...}}` |

```
$ curl -s http://localhost:3000/api/users
[{"id":1,"name":"Иванов Иван","group":"478"}]

$ curl -s -X POST -H "Content-Type: application/json" \
    -d '{"name":"Сидоров Сидор","group":"478"}' http://localhost:3000/api/users
{"id":2,"name":"Сидоров Сидор","group":"478"}
```

Request body for `POST` and `PUT` is `{"name": "...", "group": "..."}`; both
fields are required. An empty name gives `400`, and a missing user gives `404`:

```
{"error":"Поле \"name\" не может быть пустым","status":400}
{"error":"Пользователь с id=99 не найден","status":404}
```

## Task 3 — middleware

The order in `app.js` is: error handler → logger → body parser → routers →
JSON 404 fallback, so the error handler is the outermost layer and catches
everything thrown below it.

### 3.1 Request logging

Every request produces two lines: the moment it arrived and, after the response
is formed, the status code and the duration in milliseconds.

```
[2026-11-18 15:02:11] --> GET /api/users
[2026-11-18 15:02:11] GET /api/users 200 - 3.4ms
```

The finish line is printed from a `finally` block, therefore failed requests
are logged as well (`404`, `500`, ...).

### 3.2 Error handling

Any exception is converted into JSON and the original status code is kept;
internal details of a `500` are never sent to the client:

```
{"error":"Внутренняя ошибка сервера","status":500}
{"error":"Студент с id=999 не найден","status":404}
```

Server-side errors (`status >= 500`) are written to the console with the stack
trace, client errors are not.

### 3.3 Authorization

`GET /protected` is registered with the `requireAuthorization` middleware:

* no `Authorization` header → `401 {"error":"Требуется заголовок Authorization","status":401}`;
* header present → the route responds with `200` and echoes the header value
  masked (`Bearer demo***`), because tokens must not be printed or returned as is.

The lab checks that the header is present; a real service would verify the token
(signature, expiration, scopes) in the same middleware.

### 3.4 Error route

`GET /error` always throws an exception, so the error middleware has something
to catch. The client receives a JSON `500` response instead of an HTML error
page, and the stack trace appears only in the server console.

## Task 4 — students API

50 students are generated when the server starts: Russian first and last names,
group codes derived from the journal group number (`478-1` … `478-4`, one
quarter of the list each), courses from 1 to 4, ids from 1 to 50. The generator
is seeded with the group number, so the same 50 records appear on every start.

| Method | Path | Result |
|---|---|---|
| GET | `/students` | `200`, student list (with filtering, search, sorting, pagination) |
| GET | `/students?group=478-1` | only the students of that group |
| GET | `/students/:id` | `200` student, `404` if it does not exist |
| POST | `/students` | `201`, created student |
| PUT | `/students/:id` | `200`, partially updated student |
| DELETE | `/students/:id` | `200`, `{"message": "...", "student": {...}}` |

A student is `{"id": 1, "name": "Смирнов Александр", "group": "478-1", "course": 2}`.
`POST` requires `name`, `group` and `course`; `PUT` accepts any subset of them:

```
$ curl -s -X PUT -H "Content-Type: application/json" \
    -d '{"course":3}' http://localhost:3000/students/51
{"id":51,"name":"Анна Смирнова","group":"478-1","course":3}
```

Validation errors are `400` and explain the field:

```
{"error":"Поле \"course\" должно быть целым числом от 1 до 4","status":400}
```

## Task 5 — pagination, sorting and search

`GET /students` accepts four optional query parameters:

| Parameter | Meaning | Default |
|---|---|---|
| `limit` | page size, 1…100 | `10` |
| `offset` | how many records to skip | `0` |
| `sort` | `id`, `name`, `group`, `course`; a leading `-` reverses the order | source order |
| `search` | case-insensitive substring of the full name | no search |
| `group` | exact group code (task 4) | no filter |

```
$ curl -s "http://localhost:3000/students?limit=2&offset=10"
$ curl -s "http://localhost:3000/students?sort=-name&limit=2"
$ curl -s "http://localhost:3000/students?sort=course&limit=3"
$ curl -s "http://localhost:3000/students?search=Ан&limit=2"
$ curl -s "http://localhost:3000/students?limit=10&offset=0&sort=name&search=Ан"
```

The response always contains the total number of matches, so pagination controls
can be built on the client:

```json
{"total":50,"limit":10,"offset":0,"count":10,"data":[{"...":"..."}]}
```

Parameters are validated instead of being silently ignored: `limit=0`,
`offset=-5` and `sort=password` give `400` with an explanation, and filters,
search, sorting and pagination can be combined in one request.

## Note

The project keeps its own `package.json` and `node_modules`, so the lab can be
installed and started independently from the repository root. Nothing is written
to disk: restarting the server restores the initial data set.
