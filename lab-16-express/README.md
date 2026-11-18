# Lab 16 — Library server on Express.js

**Student:** Evdokimov Vladislav Evgenievich (Евдокимов Владислав Евгеньевич)
**Group:** 478
**Journal number (variant):** 7

## Common requirements and how they are met

| Requirement (from the assignment) | Implementation |
|---|---|
| HTTP server on port 3000 | `server.js`, the port can be changed with `PORT` |
| Framework Express.js | `express` 5.3 |
| All five task levels | pages, books CRUD, middleware, filtering/statistics, JWT/Swagger/CSV/cache |
| JSON errors instead of HTML error pages | `middleware/error-handler.js` |
| Centralized validation | Joi schemas in `lib/validation.js`, including custom ISBN, year and genre rules |
| Comments and identifiers in English | JSDoc comments in every module |

## Layout

```
lab-16-express/
├── app.js                   # application assembly: middleware order and routers
├── server.js                # entry point, banner, graceful shutdown
├── config.js                # port, student data, JWT, cache, rate limit, genres
├── store/
│   ├── index.js             # in-memory books, users, reviews, statistics
│   └── generator.js         # 100 books generated from the group number
├── lib/
│   ├── cache.js             # 5-minute in-memory cache for GET responses
│   ├── books-cache.js       # the shared cache instance
│   ├── csv.js               # CSV export and RFC 4180 parser
│   ├── http-error.js        # error with an HTTP status
│   ├── operation-log.js     # operation log file (task 4)
│   ├── pages.js             # HTML layout, home, about, contacts, 404
│   ├── time.js              # log and page date formats
│   └── validation.js        # Joi schemas, ISBN check, id parser
├── middleware/
│   ├── logger.js            # request logging (task 3.1)
│   ├── error-handler.js     # centralized errors (task 3.4)
│   ├── auth.js              # JWT authentication and roles (task 5.2)
│   └── not-found.js         # JSON 404 for the API, HTML 404 for pages
├── routes/
│   ├── index.js             # pages, /error, /async-error, /api/health
│   ├── auth.js              # register, login, me
│   ├── books.js             # catalogue, reviews, export, import, stats
│   └── admin.js             # /api/admin: stats, users, logs
├── docs/
│   ├── swagger.js           # OpenAPI definition, components, schemas
│   └── paths.js             # @openapi annotations for every endpoint
└── logs/                    # generated operation log (git-ignored)
```

## Run

```bash
cd lab-16-express
npm install
npm start
```

* Site: `http://localhost:3000/`
* Swagger UI: `http://localhost:3000/api-docs`
* OpenAPI document: `http://localhost:3000/api-docs.json`

Demo accounts created on every start:

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Admin123!` | admin |
| `reader@example.com` | `Reader123!` | reader |

Data lives in memory and is regenerated on every start, so the screenshots can
be reproduced exactly. The operation log is written to
`lab-16-express/logs/operations.log`, which is git-ignored.

## Task 1 — pages

| Route | Content |
|---|---|
| `/` | title "Лабораторная работа №16", student and group 478, variant, current date and time, greeting, list of routes |
| `/about` | information about the developer and the stack |
| `/contacts` | GitHub profile and repository (the preferred contact channel) |

The pages share one layout with inline CSS: no external fonts, CDNs or images,
so the site also works without internet access. The date is rendered on every
request.

## Task 2 — books CRUD

| Method | Path | Access | Result |
|---|---|---|---|
| GET | `/api/books` | any authenticated | page of the catalogue |
| GET | `/api/books/:id` | any authenticated | book, `404` if missing |
| POST | `/api/books` | admin | `201`, created book with a generated id |
| PUT | `/api/books/:id` | any authenticated | updated book, only the passed fields change |
| DELETE | `/api/books/:id` | admin | confirmation and the removed book |
| GET | `/api/books/search?author=…` | any authenticated | all books of the author |

`POST` and `PUT` validate the body: `title` and `author` must not be empty,
`year` is an integer from 1000 to 2100, `genre` is one of the known genres,
`isbn` is checked with the ISBN-13 checksum. Duplicates are detected by title
and author (case-insensitive) and answered with `409`.

```
{"error":"Книга с id=999 не найдена","status":404}
{"error":"Некорректные данные","status":400,"details":["Поле year меньше 1000"]}
```

Task 5 adds authentication: every `/api/books` route requires
`Authorization: Bearer <token>`, and creating/deleting a book requires the
`admin` role.

## Task 3 — middleware

### 3.1 Request logging

Every request produces one line with the start time, method, path, status and
duration:

```
[2026-11-18 15:25:21] GET /api/books?limit=3 200 - 2.5ms
[2026-11-18 15:25:23] POST /api/books 201 - 18.4ms
```

### 3.2 Compression

`compression` negotiates `gzip` or `deflate` from `Accept-Encoding` and skips
responses smaller than 1 KB, where the headers would cost more than the body:

```
$ curl -s -D - -o /dev/null -H "Accept-Encoding: gzip" \
    -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/books?limit=100"
content-encoding: gzip
vary: Accept-Encoding
```

### 3.3 Rate limiting

At most **100 requests per minute from one IP** (`express-rate-limit`). The
limit information is returned in the `RateLimit` and `RateLimit-Policy`
headers; exceeding it gives `429` with `Retry-After`:

```
ratelimit: limit=100, remaining=0, reset=47
ratelimit-policy: 100;w=60
retry-after: 47

{"error":"Слишком много запросов с одного IP, попробуйте позже","status":429,"retryAfterSeconds":47}
```

The limiter is mounted on `/api` and `/auth`; the documentation page stays
reachable.

### 3.4 Centralized errors

All errors end up in one handler and become JSON with a matching status code:
validation `400`, missing object `404`, duplicate `409`, forbidden `403`,
unknown route `404`, unexpected exception `500`. Internal details of a `500`
are printed to the console and the log file, never returned to the client.

### 3.5 Error routes

* `/error` throws synchronously;
* `/async-error` throws inside an `async` handler after a short delay.

Both are answered by the error middleware, so the client receives
`{"error":"Внутренняя ошибка сервера","status":500}` instead of an HTML page.

## Task 4 — filtering, pagination, sorting, search, statistics

```
GET /api/books?author=Толстой
GET /api/books?year=1869
GET /api/books?yearFrom=1800&yearTo=1900
GET /api/books?limit=10&page=2
GET /api/books?sort=title
GET /api/books?sort=-year
GET /api/books?search=война
GET /api/books?genre=фантастика&sort=-rating&limit=5&page=1
```

| Parameter | Meaning | Default |
|---|---|---|
| `author` | substring of the author, case-insensitive | no filter |
| `year` | exact publication year | no filter |
| `yearFrom`, `yearTo` | year range | no filter |
| `genre` | exact genre | no filter |
| `search` | substring of the title **or** the author | no search |
| `sort` | `title`, `author`, `year`, `rating`; a leading `-` reverses the order | `title` |
| `limit` | page size, 1…100 | `10` |
| `page` | page number, starting at 1 | `1` |

The response always contains the total number of matching books:

```json
{"page":2,"limit":10,"total":100,"totalPages":10,"count":10,"data":[{"...":"..."}]}
```

`GET /api/books/stats` returns the total number of books, copies, borrowed
copies, the average rating, the oldest and the newest year, the number of books
per author and per genre, plus user and review counters.

Validation and business rules:

* `yearFrom > yearTo`, `limit=0`, `page=0`, an unknown `sort` or genre → `400`;
* duplicates by title and author → `409`;
* `availableCopies > totalCopies` → `400`;
* every operation is appended to `logs/operations.log`:

```
[2026-11-18 15:25:21] CREATE_BOOK book=101 user=admin@example.com "Тестовая книга"
[2026-11-18 15:25:21] ADD_REVIEW book=101 user=reader@example.com "rating=5"
```

## Task 5 — authentication, generated data, documentation, cache

### 5.1 Generated catalogue

100 books are created when the server starts. The generator is seeded with the
group number 478, so the same catalogue appears on every start:

* 30 real classics, including the examples from the assignment
  ("Война и мир", "Преступление и наказание", "Мастер и Маргарита");
* 70 books with generated but plausible titles, authors, years (1950–2024) and
  genres;
* every book has a unique valid ISBN-13 `978-5-478-XXXXX-C`, where `C` is the
  checksum digit, and availability data (`totalCopies`, `availableCopies`).

### 5.2 JWT authentication and roles

```
POST /auth/register  {"email":"…","password":"…","name":"…"}  → 201
POST /auth/login     {"email":"…","password":"…"}              → 200 + token
GET  /auth/me        Authorization: Bearer <token>              → current user
```

* passwords are stored as bcrypt hashes;
* registration always creates a `reader`: administrator rights cannot be
  self-assigned;
* the token is signed for one hour and contains the user id, email and role;
* every `/api/books` route requires a token, `/api/admin` requires the `admin`
  role (`403` for a reader).

### 5.3 Books and reviews

`GET /api/books/:id` returns the book together with its reader reviews.
`POST /api/books/:id/reviews` accepts `{"rating": 1…5, "comment": "…"}` and
requires a token; the review appears in the next `GET` of that book.

### 5.4 Export, import, recommendations, availability

```
GET  /api/books/export?format=csv      → books-export.csv (UTF-8 with BOM)
GET  /api/books/export?format=json     → books-export.json
POST /api/books/import                 → Content-Type: text/csv, body = file
GET  /api/books/recommendations?genre=фантастика&limit=3
GET  /api/books/available?genre=роман&limit=20
```

The CSV file is sent as the request body (no multipart parser is needed):

```bash
curl -X POST -H "Content-Type: text/csv" \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     --data-binary @books-export.csv http://localhost:3000/api/books/import
```

The importer validates every line, skips duplicates and reports problems line
by line:

```json
{"imported":1,"skipped":1,"errors":[{"line":3,"message":"Поле year меньше 1000"}],"data":[…]}
```

Recommendations are the best-rated books of the genre; `available` returns only
books with `availableCopies > 0`.

### 5.5 Swagger

The OpenAPI 3.0 document is generated by `swagger-jsdoc` from the `@openapi`
annotations in `docs/paths.js` and served interactively at `/api-docs`. The raw
document is available at `/api-docs.json`. The "Authorize" button accepts the
token from `POST /auth/login`, so every protected endpoint can be executed from
the page.

### 5.6 Validation

Joi checks all input: bodies, query parameters and path ids. Custom rules cover
the ISBN-13 checksum, the publication year range and the genre list. Unknown
fields are stripped, so they cannot reach the store.

### 5.7 Caching

Read-only endpoints (`GET /api/books`, `/:id`, `/stats`, `/available`,
`/recommendations`, `/search`) go through an in-memory cache with a **5 minute**
lifetime:

* `X-Cache: MISS` on the first request and `X-Cache: HIT` on a repeated one;
* `X-Cache-TTL` shows the remaining lifetime in seconds;
* every create, update, delete, import or review clears the cache, so data is
  never stale after a change;
* `/api/admin/stats` reports hits, misses and the number of cached entries.

## Note

Screenshots are attached to the Pull Request and are not stored in the source
tree. The lab has its own `package.json`, so it does not change the root scripts
and does not conflict with the other lab branches.
