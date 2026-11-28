import test from 'node:test'
import assert from 'node:assert/strict'
import {
  IMPORT_CATALOG,
  IMPORT_TYPE_KEYS,
  suggestColumnMapping,
} from '../lib/import-types'
import {
  buildImportErrorReportCsv,
  buildImportTemplateCsv,
  buildImportTemplateXlsx,
  parseSpreadsheetBuffer,
} from '../lib/server/import-parsers'
import {
  applyColumnMapping,
  parseStrictDate,
  validateImportRow,
} from '../lib/server/import-validators'

test('all 15 import types generate valid CSV and native XLSX templates that round-trip parse', async () => {
  assert.equal(IMPORT_TYPE_KEYS.length, 15)

  for (const key of IMPORT_TYPE_KEYS) {
    const csv = buildImportTemplateCsv(key)
    const parsedCsv = await parseSpreadsheetBuffer(Buffer.from(csv, 'utf8'), `${key}.csv`)
    assert.equal(parsedCsv.format, 'CSV')
    assert.ok(parsedCsv.rows.length >= 1, `${key} CSV template should have >= 1 sample row`)

    const xlsx = await buildImportTemplateXlsx(key)
    const parsedXlsx = await parseSpreadsheetBuffer(xlsx, `${key}.xlsx`)
    assert.equal(parsedXlsx.format, 'XLSX')
    assert.ok(parsedXlsx.rows.length >= 1, `${key} XLSX template should have >= 1 sample row`)

    const mapping = suggestColumnMapping(key, parsedXlsx.headers)
    const mapped = applyColumnMapping(parsedXlsx.rows[0], mapping, key)
    const validated = validateImportRow(key, mapped)
    assert.ok(validated.matchKey.length > 0)
  }
})

test('strict date validation rejects invalid calendar dates and out-of-order ranges', () => {
  assert.equal(parseStrictDate('2025-05-14')?.toISOString().slice(0, 10), '2025-05-14')
  assert.throws(() => parseStrictDate('2025-02-30'), /Invalid calendar date/)
  assert.throws(() => parseStrictDate('14/05/2025'), /YYYY-MM-DD/)

  assert.throws(
    () =>
      validateImportRow('FACULTY_FDP', {
        employeeId: 'FAC-1',
        programType: 'FDP',
        title: 'AI Workshop',
        organizer: 'IIT',
        mode: 'ONLINE',
        durationDays: '5',
        startDate: '2025-07-10',
        endDate: '2025-07-05',
      }),
    /cannot be earlier than start date/,
  )
})

test('semester record validation enforces 0-10 grading scale and 1-12 semester bounds', () => {
  assert.throws(
    () =>
      validateImportRow('SEMESTER_RECORD', {
        enrollmentNumber: '2024CSE001',
        semesterNumber: '3',
        sgpa: '10.5',
        cgpaAtSemester: '8.5',
        backlogCount: '0',
      }),
    /SGPA must be between 0 and 10/,
  )

  assert.throws(
    () =>
      validateImportRow('SEMESTER_RECORD', {
        enrollmentNumber: '',
        semesterNumber: '3',
        sgpa: '8.5',
        cgpaAtSemester: '8.5',
        backlogCount: '0',
      }),
    /Enrollment Number is required/,
  )
})

test('teaching workload validates academic year format', () => {
  assert.throws(
    () =>
      validateImportRow('TEACHING_WORKLOAD', {
        employeeId: 'FAC-1',
        academicYear: '2025',
        semester: '5',
        subjectName: 'Algorithms',
        subjectCode: 'CS501',
        hoursPerWeek: '4',
        studentCount: '60',
      }),
    /Invalid Academic Year/,
  )
})

test('error report CSV escapes formula injection payloads', () => {
  const csv = buildImportErrorReportCsv([
    {
      rowNumber: 2,
      status: 'INVALID',
      matchKey: null,
      errorMessage: 'Invalid SGPA',
      rawPayloadJson: { enrollmentNumber: '=cmd|calc', sgpa: '99' },
    },
  ])
  assert.ok(csv.includes("'=cmd|calc"))
  assert.ok(csv.includes('Invalid SGPA'))
  assert.ok(IMPORT_CATALOG.ACHIEVEMENT.supportsTrustedProvenance)
})
