'use strict';

/**
 * Reads data from a pipe. When stdin is a terminal there is nothing to read;
 * when the CLI is started as `echo name | lab17-cli ...` the first line is used
 * as the project name and the interactive dialog is skipped automatically.
 */
function readPipedInput(timeoutMs = 250) {
  if (process.stdin.isTTY) return Promise.resolve(null);

  return new Promise((resolve) => {
    let data = '';
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(data.trim() ? data : null);
    };

    const timer = setTimeout(finish, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      finish();
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      finish();
    });

    if (process.stdin.readableEnded) {
      clearTimeout(timer);
      finish();
    }
  });
}

module.exports = { readPipedInput };
