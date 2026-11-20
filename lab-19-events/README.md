# Lab 19 — Exploring the Node.js `events` module

**Student:** Evdokimov Vladislav Evgenievich
**Group:** 478
**Variant:** 7

All scripts use only the built-in `events`, `http` and `os` modules, so there
are no third-party dependencies and no `npm install` is required. Node.js 18 or
newer is enough.

## Project structure

```
lab-19-events/
├── config.js              # student data, port and monitor interval
├── lib/
│   ├── args.js            # tiny CLI argument parser
│   ├── format.js          # GB, percent, uptime and Russian plurals
│   └── event-bus.js       # task 5: EventBus class
├── test/event-bus.test.js # node:test unit tests for the EventBus
├── events-basic.js        # task 1: simple EventEmitter and emit()
├── events-once.js         # task 2: on/once and subscription management
├── events-class.js        # task 3: DatabaseConnection extends EventEmitter
├── events-advanced.js     # task 4: newListener/removeListener, plugins, leaks, async
├── event-bus.js           # task 5: priorities, wildcard, once, metrics, HTTP
├── package.json
└── README.md
```

## Task 1 (basic level) — simple EventEmitter

```bash
node events-basic.js
node events-basic.js --section events   # only the three events
node events-basic.js --section emit     # only the emit() return values
```

`greet`, `info` and `bye` listeners are registered with `on()`. `emit()`
returns `true` when at least one listener exists and `false` otherwise, which is
shown for the unknown event and for the subscribed events.

## Task 2 (medium level) — `on`, `once` and subscription management

```bash
node events-once.js
node events-once.js --section once
node events-once.js --section counts
node events-once.js --section remove
node events-once.js --section order
```

* `on` fires on every emit, `once` only on the first one;
* `listenerCount()` and `listeners()` show the current subscriptions;
* `removeListener()` removes one listener, `removeAllListeners()` removes all;
* listeners are invoked in the order they were added.

## Task 3 (advanced level) — inheritance from EventEmitter

```bash
node events-class.js                 # connect, query, close and a handled error
node events-class.js --section error # error handled by a listener
node events-class.js --crash         # real crash: no error listener
```

`DatabaseConnection extends EventEmitter` with `connect()`, `query(sql)`,
`close()` and `error(error)`. Query results are **simulated deterministically**
(the lab has no real database): `SELECT` returns 50 rows, `INSERT` one row,
`UPDATE` three rows — the code labels them as a simulation.

The `error` event keeps its special Node.js status: with a listener the process
continues, without a listener `emit('error')` throws and the process exits with
an uncaught exception (shown by the `--crash` run with exit code 1).

## Task 4 (hard level) — `newListener`, `removeListener`, plugins

```bash
node events-advanced.js
node events-advanced.js --section new
node events-advanced.js --section remove
node events-advanced.js --section plugins
node events-advanced.js --section leak
node events-advanced.js --section async
```

* `newListener` logs every subscription before it is added;
* `removeListener` logs every removal and is used to clean up plugin handlers;
* `PluginManager extends EventEmitter` registers a plugin by attaching its
  handler and emits `plugin:registered`, unregistering emits `plugin:removed`;
* the leak demo shows `listenerCount` growing from 10 to 1010 and returning to 0
  after `removeAllListeners` (the default max-listeners warning is disabled
  intentionally for the demo);
* an `async` listener is not awaited by `emit`: the sync listeners and
  `setImmediate` finish first, the async listener reports after 100 ms. Logs of
  the asynchronous part carry the `[478]` prefix.

## Task 5 (expert level) — EventBus

```bash
node event-bus.js                       # all demo sections
node event-bus.js --section priority
node event-bus.js --section wildcard
node event-bus.js --section once
node event-bus.js --section errors
node event-bus.js --section metrics
node event-bus.js --section server --port 3000 --duration 7
```

`EventBus extends EventEmitter` and adds:

| Feature | API | Behaviour |
|---|---|---|
| priorities | `on(event, listener, priority)` | higher priority runs first, equal priorities keep registration order |
| once cache | `once(event, listener, priority)` | removed before the call, runs exactly once |
| wildcard | `onAny(listener)` / `offAny(listener)` | receives the event name and all arguments |
| unsubscribe | `off(event, listener)` | removes one listener |
| metrics | `getMetrics()` | per-event counters, total, listeners, errors, last call time |
| errors | `error` listener | listener exceptions are caught and logged, a missing `error` listener throws |

The server section integrates with `http` and `os`: every request emits
`request`, the `os` monitor emits `system` with free RAM, core count and uptime,
and `GET /metrics` returns the metrics as JSON:

```json
{
  "group": "478",
  "events": { "system": 1, "request": 1 },
  "total": 2,
  "listeners": { "request": 1, "system": 1 },
  "errors": {},
  "lastCalled": { "...": "..." }
}
```

`--duration <seconds>` stops the server cleanly (useful for demos), `Ctrl+C` is
handled by a `SIGINT` listener.

## Tests

```bash
npm test
```

`node:test` covers priority ordering (including equal priorities), the once
cache, `onAny`, `off`, emit return values, listener exception handling, the
special `error` event and metrics.
