import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateOfficialDateFilter,
  isHackathonAchievement,
} from '../lib/server/services/reporting-math'

test('AUD-05: official dated reports exclude records with missing activity dates unless provisional mode is enabled', () => {
  const window2025 = {
    from: new Date('2025-06-01T00:00:00Z'),
    to: new Date('2026-05-31T23:59:59Z'),
  }
  const uploadedToday = new Date('2026-11-27T00:00:00Z')
  const historicalAward = new Date('2024-02-10T00:00:00Z')
  const inWindowAward = new Date('2025-11-15T00:00:00Z')

  // Missing activity date excluded in official mode
  const missingOfficial = evaluateOfficialDateFilter(null, uploadedToday, window2025, false)
  assert.equal(missingOfficial.included, false)
  assert.equal(missingOfficial.isMissingActivityDate, true)

  // Missing activity date evaluated against createdAt ONLY in provisional mode
  const missingProvisionalOut = evaluateOfficialDateFilter(null, uploadedToday, window2025, true)
  assert.equal(missingProvisionalOut.isMissingActivityDate, true)
  assert.equal(missingProvisionalOut.included, false) // uploadedToday is outside 2025-26

  const missingProvisionalIn = evaluateOfficialDateFilter(
    null,
    new Date('2025-10-01T00:00:00Z'),
    window2025,
    true,
  )
  assert.equal(missingProvisionalIn.included, true)

  // Historical award uploaded today is NOT counted in 2025-26
  const historicalCheck = evaluateOfficialDateFilter(historicalAward, uploadedToday, window2025, false)
  assert.equal(historicalCheck.included, false)
  assert.equal(historicalCheck.isMissingActivityDate, false)

  // Valid in-window activity date IS included
  const validCheck = evaluateOfficialDateFilter(inWindowAward, uploadedToday, window2025, false)
  assert.equal(validCheck.included, true)
  assert.equal(validCheck.isMissingActivityDate, false)
})

test('AUD-09: isHackathonAchievement excludes coding contests, robotics, and generic TECHNICAL achievements', () => {
  assert.equal(isHackathonAchievement({ categoryCode: 'HACKATHON', subcategory: '24-Hour Hackathon' }), true)
  assert.equal(isHackathonAchievement({ categoryCode: 'TECHNICAL', subcategory: 'Smart India Hackathon' }), true)

  // Non-hackathon technical activities must NOT be classified as hackathons
  assert.equal(isHackathonAchievement({ categoryCode: 'TECHNICAL', subcategory: 'Competitive Programming' }), false)
  assert.equal(isHackathonAchievement({ categoryCode: 'TECHNICAL', subcategory: 'Robotics' }), false)
  assert.equal(isHackathonAchievement({ categoryCode: 'ACADEMIC_COMPETITION', subcategory: 'Paper Presentation' }), false)
  assert.equal(isHackathonAchievement({ categoryCode: null, subcategory: null }), false)
})
