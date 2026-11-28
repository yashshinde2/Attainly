import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validateCustomFieldValue,
  validateSafeRegexPattern,
} from '../lib/server/services/institution-config'

test('Phase 11E: custom field validation enforces data types, enums, dates, and safe regex', () => {
  assert.equal(validateSafeRegexPattern('^[0-9]{12}$'), '^[0-9]{12}$')
  assert.throws(() => validateSafeRegexPattern('[invalid('), /Invalid validation regular expression/)
  assert.throws(() => validateSafeRegexPattern('a'.repeat(121)), /cannot exceed 120 characters/)

  assert.equal(
    validateCustomFieldValue(
      { displayName: 'APAAR ID', dataType: 'TEXT', isRequired: true, allowedValues: [], validationRegex: '^[0-9]{12}$' },
      '123456789012',
    ),
    '123456789012',
  )
  assert.throws(
    () =>
      validateCustomFieldValue(
        { displayName: 'APAAR ID', dataType: 'TEXT', isRequired: true, allowedValues: [], validationRegex: '^[0-9]{12}$' },
        'bad-id',
      ),
    /does not match the required format/,
  )
  assert.throws(
    () =>
      validateCustomFieldValue(
        { displayName: 'Blood Group', dataType: 'SELECT', isRequired: true, allowedValues: ['A+', 'O+'], validationRegex: null },
        'Z+',
      ),
    /must be one of/,
  )
  assert.throws(
    () =>
      validateCustomFieldValue(
        { displayName: 'Join Date', dataType: 'DATE', isRequired: false, allowedValues: [], validationRegex: null },
        '2025-02-30',
      ),
    /not a valid calendar date/,
  )
})
