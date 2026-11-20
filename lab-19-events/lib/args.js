'use strict';

/**
 * Minimal command line parser for "--flag value" and "--flag=value" forms.
 * @param {string[]} argv process.argv.slice(2)
 * @returns {{ _: string[], [key: string]: string|boolean|string[] }}
 */
function parseArgs(argv) {
  const result = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      result._.push(token);
      continue;
    }

    const body = token.slice(2);
    const separator = body.indexOf('=');

    if (separator !== -1) {
      result[body.slice(0, separator)] = body.slice(separator + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      result[body] = next;
      index += 1;
    } else {
      result[body] = true;
    }
  }

  return result;
}

module.exports = { parseArgs };
