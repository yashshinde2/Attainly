import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'

import {
  REPORT_PACKAGES,
  REPORT_PACKAGE_KEYS,
  isReportPackageKey,
} from '../lib/report-packages'
import {
  buildReportPackagePdfBuffer,
  buildReportPackageXlsxBuffer,
  buildReportPackageZipBuffer,
} from '../lib/server/services/report-package-renderers'
import type { GeneratedReportPackage } from '../lib/server/services/report-packages'

const SAMPLE_PKG: GeneratedReportPackage = {
  snapshotId: 'snap-test-001',
  packageKey: 'DEPARTMENT_ANNUAL_REPORT',
  title: 'Department Annual Report',
  institutionName: 'Vanguard Institute of Technology',
  reportHeaderTitle: 'Office of Academic Affairs',
  reportHeaderSubtitle: 'Annual Institutional Dossier',
  targetLabel: 'Computer Science & Engineering',
  metadata: {
    reportingPeriod: '2025-26 (2025-07-01 to 2026-06-30)',
    appliedFilters: { departmentId: 'dept-cse', includeUnverified: 'false' },
    countingUnits: ['Verified records', 'Completed events'],
    verificationScope: 'VERIFIED records only',
    exactnessNote: 'Exact counts from institutional database.',
    excludedMissingDateCount: 1,
    generatedAt: '2026-11-28T12:00:00.000Z',
    snapshotId: 'snap-test-001',
    disclaimer:
      'Generated from Attainly institutional records. Does not assert official NAAC/NBA/AICTE accreditation scores.',
  },
  sections: [
    {
      id: 'student_achievements',
      title: 'Student Achievements',
      countingUnit: 'Verified achievement submissions',
      verificationScope: 'VERIFIED records only',
      excludedMissingDateCount: 1,
      summaryMetrics: [{ label: 'Total Verified', value: 2 }],
      columns: [
        { key: 'title', label: 'Title' },
        { key: 'studentName', label: 'Student' },
        { key: 'status', label: 'Status' },
      ],
      rows: [
        { title: 'Smart India Hackathon Finalist', studentName: 'Aarav Sharma', status: 'VERIFIED' },
        { title: 'IEEE Paper Award', studentName: 'Diya Patel', status: 'VERIFIED' },
      ],
      totalRows: 2,
    },
  ],
  evidencePaths: ['institutions/inst-other/users/u1/unauthorized.pdf'],
}

describe('Report Packages Registry & Renderers', () => {
  it('registers all 11 required report packages with valid metadata', () => {
    assert.equal(REPORT_PACKAGE_KEYS.length, 11)
    for (const key of REPORT_PACKAGE_KEYS) {
      assert.equal(isReportPackageKey(key), true)
      const def = REPORT_PACKAGES[key]
      assert.ok(def.sections.length > 0)
      assert.ok(def.label.length > 3)
    }
    assert.equal(isReportPackageKey('NON_EXISTENT_PACKAGE'), false)
  })

  it('renders a valid PDF buffer with %PDF header', async () => {
    const pdf = await buildReportPackagePdfBuffer(SAMPLE_PKG)
    assert.equal(pdf.subarray(0, 5).toString('utf-8'), '%PDF-')
    assert.ok(pdf.length > 1000)
  })

  it('renders a multi-sheet XLSX workbook with Cover & Audit Metadata', async () => {
    const xlsx = await buildReportPackageXlsxBuffer(SAMPLE_PKG)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(xlsx as unknown as ArrayBuffer)
    const sheetNames = wb.worksheets.map((ws) => ws.name)
    assert.ok(sheetNames.includes('Cover & Audit Metadata'))
    assert.ok(sheetNames.includes('Student Achievements'))
  })

  it('builds an Evidence ZIP and excludes cross-tenant evidence paths', async () => {
    const zip = await buildReportPackageZipBuffer('inst-1', SAMPLE_PKG)
    assert.equal(zip.subarray(0, 2).toString('utf-8'), 'PK')
    assert.ok(zip.length > 2000)
  })
})
