'use strict';

/**
 * Localizes the help and error texts that commander generates itself.
 * The command descriptions are already written in Russian.
 */
const REPLACEMENTS = [
  [/^Usage:/gm, 'Использование:'],
  [/^Options:/gm, 'Опции:'],
  [/^Global Options:/gm, 'Глобальные опции:'],
  [/^Commands:/gm, 'Команды:'],
  [/^Arguments:/gm, 'Аргументы:'],
  [/display help for command/g, 'показать справку'],
  [/output the version number/g, 'вывести версию'],
  [/\(default: /g, '(по умолчанию: '],
];

function localize(text) {
  return REPLACEMENTS.reduce((result, [pattern, value]) => result.replace(pattern, value), text);
}

/** Explains commander errors in Russian instead of the default English text. */
function formatCommanderError(text) {
  const cleaned = text.replace(/^error:\s*/i, '').trim();

  const unknown = cleaned.match(/^unknown command ['"]?(.+?)['"]?$/i);
  if (unknown) return `✖ Ошибка: неизвестная команда "${unknown[1]}"`;

  const missing = cleaned.match(/^missing required argument ['"]?(.+?)['"]?$/i);
  if (missing) return `✖ Ошибка: не указан обязательный аргумент "${missing[1]}"`;

  return `✖ Ошибка: ${cleaned}`;
}

function configureOutput(program) {
  program.configureOutput({
    writeOut: (text) => process.stdout.write(localize(text)),
    writeErr: (text) => process.stderr.write(localize(text)),
    outputError: (text, write) => write(`${formatCommanderError(text)}\n`),
  });
}

module.exports = { localize, formatCommanderError, configureOutput };
