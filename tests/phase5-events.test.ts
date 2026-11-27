import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkEventEligibility,
  generateCertificateRef,
  mapCategoryToAchievementCategory,
  mapCategoryToLegacyType,
} from '../lib/server/services/event-rules'

test('checkEventEligibility enforces status, deadline, capacity, role, department, and batch rules', () => {
  const baseEvent = {
    status: 'PUBLISHED',
    registrationDeadline: new Date('2030-01-01T00:00:00Z'),
    capacity: 100,
    eligibilityRoles: ['STUDENT'],
    eligibleDepartmentIds: ['dept-cse'],
    eligibleBatches: [2023, 2024],
    currentParticipantCount: 10,
    isAlreadyRegistered: false,
  }
  const now = new Date('2026-06-01T00:00:00Z')

  assert.equal(
    checkEventEligibility(baseEvent, { portalRole: 'STUDENT', departmentId: 'dept-cse', admissionYear: 2023 }, now).eligible,
    true,
  )

  // Wrong role
  const facultyCheck = checkEventEligibility(
    baseEvent,
    { portalRole: 'FACULTY', departmentId: 'dept-cse', admissionYear: null },
    now,
  )
  assert.equal(facultyCheck.eligible, false)

  // Wrong department
  const deptCheck = checkEventEligibility(
    baseEvent,
    { portalRole: 'STUDENT', departmentId: 'dept-ece', admissionYear: 2023 },
    now,
  )
  assert.equal(deptCheck.eligible, false)

  // Wrong batch
  const batchCheck = checkEventEligibility(
    baseEvent,
    { portalRole: 'STUDENT', departmentId: 'dept-cse', admissionYear: 2022 },
    now,
  )
  assert.equal(batchCheck.eligible, false)

  // Capacity full
  const fullCheck = checkEventEligibility(
    { ...baseEvent, currentParticipantCount: 100 },
    { portalRole: 'STUDENT', departmentId: 'dept-cse', admissionYear: 2023 },
    now,
  )
  assert.equal(fullCheck.eligible, false)

  // Deadline passed
  const deadlineCheck = checkEventEligibility(
    { ...baseEvent, registrationDeadline: new Date('2025-01-01T00:00:00Z') },
    { portalRole: 'STUDENT', departmentId: 'dept-cse', admissionYear: 2023 },
    now,
  )
  assert.equal(deadlineCheck.eligible, false)

  // Draft event
  const draftCheck = checkEventEligibility(
    { ...baseEvent, status: 'DRAFT' },
    { portalRole: 'STUDENT', departmentId: 'dept-cse', admissionYear: 2023 },
    now,
  )
  assert.equal(draftCheck.eligible, false)
})

test('generateCertificateRef produces deterministic unique institution references', () => {
  const ref1 = generateCertificateRef('evt_abc12345', 'usr_xyz98765', 2026)
  const ref2 = generateCertificateRef('evt_abc12345', 'usr_xyz98765', 2026)
  const refOther = generateCertificateRef('evt_abc12345', 'usr_other111', 2026)

  assert.equal(ref1, ref2)
  assert.notEqual(ref1, refOther)
  assert.match(ref1, /^ATT-2026-/)
})

test('category mappers map configurable event categories to legacy EventType and AchievementCategory', () => {
  assert.equal(mapCategoryToLegacyType('HACKATHON'), 'TECHNICAL')
  assert.equal(mapCategoryToLegacyType('SPORTS'), 'SPORTS')
  assert.equal(mapCategoryToLegacyType('CULTURAL'), 'CULTURAL')
  assert.equal(mapCategoryToLegacyType('SOCIAL_OUTREACH'), 'NON_TECHNICAL')

  assert.equal(mapCategoryToAchievementCategory('HACKATHON', 'TECHNICAL'), 'TECHNICAL')
  assert.equal(mapCategoryToAchievementCategory('ACADEMIC_COMPETITION', 'TECHNICAL'), 'TECHNICAL')
  assert.equal(mapCategoryToAchievementCategory('SEMINAR', 'NON_TECHNICAL'), 'NON_TECHNICAL')
  assert.equal(mapCategoryToAchievementCategory('SPORTS', 'SPORTS'), 'SPORTS')
  assert.equal(mapCategoryToAchievementCategory('CULTURAL', 'CULTURAL'), 'CULTURAL')
})
