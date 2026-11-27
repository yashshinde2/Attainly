import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateStudentCompleteness } from '../lib/completeness'
import { graduateOutcomeInput, placementOfferInput } from '../lib/server/services/student-career'

test('Completeness: separates mandatory core profile from optional achievements & engagement', () => {
  const result = calculateStudentCompleteness({
    hasPersonalInfo: true,
    hasInstitutionalIdentity: true,
    educationCount: 1,
    semesterCount: 2,
    skillCount: 3,
    achievementCount: 0,
    participationCount: 0,
    certificationCount: 0,
    researchPaperCount: 0,
    patentCount: 0,
    projectCount: 0,
    internshipCount: 0,
    placementOfferCount: 0,
    hasGraduateOutcome: false,
  })

  assert.equal(result.mandatory?.percentage, 100)
  assert.equal(result.optional?.percentage, 0)
  assert.equal(result.mandatory?.missingSections.length, 0)
  assert.equal(result.optional?.items.length, 5)
})

test('Career schemas: placementOfferInput & graduateOutcomeInput validate required fields and emails', () => {
  const offer = placementOfferInput.parse({
    companyName: 'Acme Corp',
    role: 'SDE-1',
    packageCtc: '12 LPA',
    status: 'ACCEPTED',
  })
  assert.equal(offer.companyName, 'Acme Corp')
  assert.equal(offer.status, 'ACCEPTED')

  assert.throws(() => placementOfferInput.parse({ companyName: '', role: 'SDE' }))

  const outcome = graduateOutcomeInput.parse({
    outcomeType: 'HIGHER_STUDIES',
    organizationOrUniversity: 'IISc Bengaluru',
    programOrRole: 'M.Tech AI',
    alumniEmail: 'sam@alumni.edu',
  })
  assert.equal(outcome.outcomeType, 'HIGHER_STUDIES')

  assert.throws(() =>
    graduateOutcomeInput.parse({
      outcomeType: 'ALUMNI',
      alumniEmail: 'not-an-email',
    }),
  )
})
