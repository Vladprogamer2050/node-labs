'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CliError } = require('../../utils/errors');
const {
  generateReport,
  convertFile,
  assertReportType,
  buildPdf,
  REPORT_TYPES,
} = require('../../services/report-service');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lab17-report-'));
}

describe('report service', () => {
  test('rejects an unknown report type', () => {
    expect(() => assertReportType('docx')).toThrow(CliError);
    expect(() => generateReport({ type: 'docx', baseDir: tempDir() })).toThrow(
      /недопустимый тип отчёта "docx"/
    );
  });

  test('knows exactly the four supported types', () => {
    expect(REPORT_TYPES).toEqual(['html', 'pdf', 'json', 'csv']);
  });

  test('generates an html report with the student data', () => {
    const dir = tempDir();
    const result = generateReport({ type: 'html', output: 'report.html', baseDir: dir });

    expect(result.path).toBe('report.html');
    expect(result.bytes).toBeGreaterThan(0);
    const html = fs.readFileSync(path.join(dir, 'report.html'), 'utf8');
    expect(html).toContain('Отчёт по лабораторной работе №17');
    expect(html).toContain('Евдокимов Владислав Евгеньевич');
    expect(html).toContain('478');
  });

  test('generates a valid pdf document', () => {
    const dir = tempDir();
    generateReport({ type: 'pdf', output: 'report.pdf', baseDir: dir });
    const pdf = fs.readFileSync(path.join(dir, 'report.pdf'));

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('%%EOF');
    expect(pdf.toString('latin1')).toContain('Laboratory work 17');
  });

  test('generates json that can be parsed back', () => {
    const dir = tempDir();
    generateReport({ type: 'json', output: 'report.json', baseDir: dir });
    const data = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));

    expect(data.lab).toBe(17);
    expect(data.student).toContain('Евдокимов');
    expect(data.group).toBe('478');
  });

  test('generates csv with a header row', () => {
    const dir = tempDir();
    generateReport({ type: 'csv', output: 'report.csv', baseDir: dir });
    const rows = fs.readFileSync(path.join(dir, 'report.csv'), 'utf8').trim().split('\r\n');

    expect(rows[0]).toBe('field,value');
    expect(rows.join('\n')).toContain('Студент');
  });

  test('uses the type in the default file name', () => {
    const dir = tempDir();
    const result = generateReport({ type: 'json', baseDir: dir });
    expect(result.path).toBe('output.json');
    expect(fs.existsSync(path.join(dir, 'output.json'))).toBe(true);
  });

  test('refuses to overwrite an existing file without force', () => {
    const dir = tempDir();
    generateReport({ type: 'json', output: 'report.json', baseDir: dir });
    expect(() => generateReport({ type: 'json', output: 'report.json', baseDir: dir })).toThrow(
      /уже существует/
    );
  });

  test('overwrites an existing file with force', () => {
    const dir = tempDir();
    generateReport({ type: 'json', output: 'report.json', baseDir: dir });
    fs.writeFileSync(path.join(dir, 'report.json'), 'stale');
    generateReport({ type: 'json', output: 'report.json', force: true, baseDir: dir });

    const data = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
    expect(data.lab).toBe(17);
  });

  test('builds a pdf buffer without writing anything', () => {
    const pdf = buildPdf();
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(500);
  });

  test('converts a text file to json and csv', () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'first line\nsecond line\n');

    const jsonResult = convertFile({ input: 'notes.txt', to: 'json', baseDir: dir });
    const data = JSON.parse(fs.readFileSync(jsonResult.absolutePath, 'utf8'));
    expect(data.lines).toBe(3);

    const csvResult = convertFile({ input: 'notes.txt', to: 'csv', baseDir: dir });
    const csv = fs.readFileSync(csvResult.absolutePath, 'utf8');
    expect(csv.startsWith('line,text')).toBe(true);
    expect(csv).toContain('first line');
  });

  test('fails on a missing input file', () => {
    expect(() => convertFile({ input: 'absent.txt', baseDir: tempDir() })).toThrow(/не найден/);
  });
});
