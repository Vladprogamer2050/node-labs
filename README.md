# Node.js Labs

Laboratory works #11-24 for the Node.js course.

**Student:** Evdokimov Vladislav Evgenievich (Евдокимов Владислав Евгеньевич)
**Group:** 478
**Journal number (variant):** 7

## Repository layout

| Path | Lab | Topic |
|---|---|---|
| `index.js` (repo root) | 11 | Node.js/NPM setup, HTTP server, Git branch and Pull Request |
| `lab-14-fs` | 14 | File system (`fs`) |
| `lab-15-koa` | 15 | Simple server on Koa.js |
| `lab-16-express` | 16 | Simple server on Express.js |
| `lab-17-cli` | 17 | CLI applications |
| `lab-18-os` | 18 | `os` module |
| `lab-19-events` | 19 | `events` module |
| `lab-20-http` | 20 | Routing with the HTTP Request object |
| `lab-21-streams` | 21 | Streams |
| `lab-22-mysql` | 22 | MySQL connection and queries |
| `lab-23-mongo` | 23 | MongoDB with the official driver |
| `lab-24-rest-api` | 24 | REST API (Koa + MongoDB) |

Lab 11 keeps its entry point at the repository root because the assignment
requires `node index.js` to be run from the project root.

## Lab 11 — run

```bash
npm start          # node index.js
```

* `http://localhost:3000/` — page with the greeting, full name, group and Pi
* `http://localhost:3000/api/student` — the same data as JSON

Pi is computed with the Machin formula `16*arctan(1/5) - 4*arctan(1/239)`
(series expansion, no math libraries) and printed with 7 digits — the journal
number.

Branches:

* `main` — initial Hello World server
* `feature/student-info` — student info and Pi calculation

Screenshots of the running application are attached to the Pull Request and are
not stored in the repository.
