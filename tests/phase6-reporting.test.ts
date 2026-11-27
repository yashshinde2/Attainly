import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeDistinctPublicationStats,
  computeEventParticipationMetrics,
  computePlacementMetrics,
  isWithinDateWindow,
  resolveEffectiveActivityDate,
} from '../lib/server/services/reporting-math'
import { buildCsvContent, buildExcelXmlContent } from '../lib/report-types'
import { buildZipBuffer } from '../lib/server/zip'

test('computePlacementMetrics distinguishes job offers from distinct placed students and respects verification scope', () => {
  const offers = [
    { studentProfileId: 'stu-1', packageLpa: 12, offerStatus: 'ACCEPTED', verificationStatus: 'VERIFIED' },
    { studentProfileId: 'stu-1', packageLpa: 15, offerStatus: 'OFFERED', verificationStatus: 'VERIFIED' },
    { studentProfileId: 'stu-2', packageLpa: 10, offerStatus: 'ACCEPTED', verificationStatus: 'VERIFIED' },
    { studentProfileId: 'stu-3', packageLpa: 20, offerStatus: 'OFFERED', verificationStatus: 'PENDING' },
    { studentProfileId: 'stu-4', packageLpa: 8, offerStatus: 'DECLINED', verificationStatus: 'VERIFIED' },
  ]

  const verifiedOnly = computePlacementMetrics(offers, false)
  assert.equal(verifiedOnly.totalOffers, 4)
  assert.equal(verifiedOnly.distinctPlacedStudents, 2) // stu-1 and stu-2 (stu-4 declined, stu-3 pending)
  assert.equal(verifiedOnly.highestPackageLpa, 15)

  const withPending = computePlacementMetrics(offers, true)
  assert.equal(withPending.totalOffers, 5)
  assert.equal(withPending.distinctPlacedStudents, 3)
  assert.equal(withPending.highestPackageLpa, 20)
})

test('computeDistinctPublicationStats deduplicates co-authored publications by DOI', () => {
  const pubs = [
    { id: 'p1', doi: '10.1000/xyz', title: 'AI Paper', verificationStatus: 'VERIFIED', authorCount: 3 },
    { id: 'p2', doi: '10.1000/XYZ ', title: 'AI Paper', verificationStatus: 'VERIFIED', authorCount: 1 },
    { id: 'p3', doi: null, title: 'Systems Paper', verificationStatus: 'VERIFIED', authorCount: 2 },
    { id: 'p4', doi: '10.1000/pending', title: 'Draft Paper', verificationStatus: 'PENDING', authorCount: 2 },
  ]

  const verified = computeDistinctPublicationStats(pubs, false)
  assert.equal(verified.distinctPublications, 2) // p1+p2 share DOI, p3 is distinct
  assert.equal(verified.totalRecords, 3)
  assert.equal(verified.totalAuthorCredits, 6)

  const all = computeDistinctPublicationStats(pubs, true)
  assert.equal(all.distinctPublications, 3)
})

test('computeEventParticipationMetrics separates registrations, confirmed attendance, unique participants, and winners', () => {
  const rows = [
    { userId: 'u1', registrationStatus: 'CONFIRMED', attendanceStatus: 'PRESENT', role: 'WINNER' },
    { userId: 'u2', registrationStatus: 'CONFIRMED', attendanceStatus: 'PRESENT', role: 'PARTICIPANT' },
    { userId: 'u3', registrationStatus: 'REGISTERED', attendanceStatus: 'PENDING', role: 'PARTICIPANT' },
    { userId: 'u4', registrationStatus: 'CANCELLED', attendanceStatus: 'ABSENT', role: 'PARTICIPANT' },
  ]

  const m = computeEventParticipationMetrics(rows)
  assert.equal(m.registrations, 3) // excludes CANCELLED
  assert.equal(m.confirmedParticipants, 2)
  assert.equal(m.uniqueConfirmedParticipants, 2)
  assert.equal(m.winners, 1)
})

test('resolveEffectiveActivityDate prefers historical activity date over record createdAt', () => {
  const historicalAward = new Date('2024-02-15T00:00:00Z')
  const createdToday = new Date('2026-11-27T00:00:00Z')
  const effective = resolveEffectiveActivityDate(historicalAward, createdToday)

  assert.equal(effective.toISOString(), historicalAward.toISOString())
  assert.equal(
    isWithinDateWindow(effective, {
      from: new Date('2024-01-01T00:00:00Z'),
      to: new Date('2024-12-31T23:59:59Z'),
    }),
    true,
  )
  assert.equal(
    isWithinDateWindow(effective, {
      from: new Date('2026-01-01T00:00:00Z'),
      to: new Date('2026-12-31T23:59:59Z'),
    }),
    false,
  )
})

test('CSV, Excel XML, and ZIP archive builders produce valid non-empty outputs with metadata', () => {
  const sampleReport = {
    entityType: 'PLACEMENTS' as const,
    title: 'Placements',
    subtitle: 'Offers vs Placed Students',
    institutionName: 'Attainly Demo',
    countingUnit: 'Job offers AND distinct placed students',
    verificationScope: 'Verified records only',
    columns: [
      { key: 'studentName', label: 'Student' },
      { key: 'packageLpa', label: 'Package (LPA)' },
    ],
    rows: [{ studentName: 'Aarav', packageLpa: 12 }],
    generatedAt: '2026-11-27T10:00:00.000Z',
  }

  const csv = buildCsvContent(sampleReport)
  assert.match(csv, /Attainly Demo/)
  assert.match(csv, /Verified records only/)

  const xls = buildExcelXmlContent(sampleReport)
  assert.match(xls, /<Workbook/)
  assert.match(xls, /Metadata &amp; Audit/)

  const zip = buildZipBuffer([{ name: 'manifest.json', data: Buffer.from('{"ok":true}', 'utf8') }])
  assert.equal(zip.readUInt32LE(0), 0x04034b50) // PKZIP local file header signature
})
