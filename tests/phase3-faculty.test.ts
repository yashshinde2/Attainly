import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateFacultyCompleteness } from '../lib/completeness'
import {
  canonicalPublicationSchema,
  consultancySchema,
  contributionSchema,
  fdpSchema,
  researchGrantSchema,
  teachingLoadSchema,
} from '../lib/server/services/faculty-portfolio'

test('Faculty completeness: separates mandatory academic profile from optional research & outreach', () => {
  const result = calculateFacultyCompleteness({
    hasPersonalInfo: true,
    hasInstitutionalIdentity: true,
    educationCount: 1,
    experienceCount: 1,
    teachingLoadCount: 2,
    certificationCount: 0,
    fdpCount: 0,
    researchPaperCount: 0,
    canonicalPublicationCount: 1,
    patentCount: 0,
    grantCount: 0,
    consultancyCount: 0,
    contributionCount: 0,
  })

  assert.equal(result.mandatory?.percentage, 100)
  assert.equal(result.optional?.percentage, 25)
})

test('Faculty schemas: enforce date ranges and required fields', () => {
  assert.throws(
    () =>
      fdpSchema.parse({
        programType: 'FDP',
        title: 'AI Pedagogy',
        organizer: 'IIT',
        mode: 'ONLINE',
        startDate: '2026-05-10',
        endDate: '2026-05-01',
      }),
    /End date cannot be earlier than start date/,
  )

  assert.throws(
    () =>
      consultancySchema.parse({
        title: 'Audit',
        clientOrganization: 'Acme',
        startDate: '2026-06-10',
        endDate: '2026-06-01',
      }),
    /End date cannot be earlier than start date/,
  )

  assert.throws(
    () =>
      researchGrantSchema.parse({
        title: 'Grant',
        fundingAgency: 'DST',
        startDate: '2026-06-10',
        endDate: '2026-06-01',
      }),
    /End date cannot be earlier than start date/,
  )

  const pub = canonicalPublicationSchema.parse({
    title: 'Zero-Trust Campus Networks',
    publicationType: 'JOURNAL',
    doi: '10.1109/ZT.2026.001',
    issnOrIsbn: '1234-5678',
    indexing: 'SCOPUS',
    authorOrder: 1,
    authorRole: 'FIRST_AUTHOR',
  })
  assert.equal(pub.doi, '10.1109/ZT.2026.001')

  const load = teachingLoadSchema.parse({
    academicYear: '2025-26',
    semester: 5,
    subjectName: 'Distributed Systems',
    hoursPerWeek: 4,
    studentCount: 60,
  })
  assert.equal(load.hoursPerWeek, 4)

  const ctr = contributionSchema.parse({
    contributionType: 'COMMITTEE',
    title: 'IQAC Member',
    organizationOrBody: 'Attainly Institute',
  })
  assert.equal(ctr.contributionType, 'COMMITTEE')
})
