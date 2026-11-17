const http = require('http');

const PORT = 3000;

// Номер по журналу = номер варианта = количество знаков после запятой для числа Пи
const JOURNAL_NUMBER = 7;

const student = {
  fullName: 'Евдокимов Владислав Евгеньевич',
  group: '478',
};

/**
 * Арктангенс через ряд Тейлора: arctan(z) = z - z^3/3 + z^5/5 - z^7/7 + ...
 * Считаем для z = 1/x, поэтому ряд быстро сходится.
 * Никакие библиотеки для вычисления Пи не используются.
 */
function arctanInverse(x) {
  const z2 = 1 / (x * x);
  let term = 1 / x; // текущий член ряда: z^(2n+1)
  let sum = 0;
  let n = 1; // знаменатель 2n-1
  let sign = 1;
  const EPS = 1e-20;

  while (term > EPS) {
    sum += (sign * term) / n;
    term *= z2;
    n += 2;
    sign = -sign;
  }
  return sum;
}

/** Формула Мэчина: pi = 16*arctan(1/5) - 4*arctan(1/239) */
function computePi() {
  return 16 * arctanInverse(5) - 4 * arctanInverse(239);
}

const piValue = computePi().toFixed(JOURNAL_NUMBER);

function renderHtml() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Лабораторная работа №11</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 40px; line-height: 1.7; }
    h1 { font-size: 22px; }
    .line { font-size: 18px; }
    .note { color: #666; margin-top: 24px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>Привет, мир!</h1>
  <div class="line">${student.fullName}</div>
  <div class="line">${student.group}</div>
  <div class="line">${piValue}</div>
  <p class="note">Число Пи вычислено по формуле Мэчина без сторонних библиотек:
  16&middot;arctan(1/5) &minus; 4&middot;arctan(1/239), точность &mdash; ${JOURNAL_NUMBER} знаков
  (номер по журналу).</p>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/student') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        fullName: student.fullName,
        group: student.group,
        pi: piValue,
        journalNumber: JOURNAL_NUMBER,
      })
    );
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(renderHtml());
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Студент: ${student.fullName}`);
    console.log(`Группа: ${student.group}`);
    console.log(`Число Пи (${JOURNAL_NUMBER} знаков): ${piValue}`);
  });
}

module.exports = { computePi, arctanInverse, student, server };
