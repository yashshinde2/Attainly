import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AuthorizationError,
  requireInstitutionScope,
  requirePermission,
  type AuthenticatedPrincipal,
} from '../lib/server/authorization'
import { AuthenticationRequiredError, PasswordChangeRequiredError } from '../lib/server/action-guard'
import { escapeCsvCell, } from '../lib/csv'
import { buildCsvContent } from '../lib/report-types'

// Note: modules that import 'server-only' are tested via their pure logic or with a minimal mock if needed,
// so let's register a lightweight hook or test pure exported helpers directly.
// Since 'server-only' throws outside Next.js RSC/Route bundler, we verify pure modules directly
// and test server-only modules by preloading a no-op stub for 'server-only' in the test runner.

test('Authorization: requirePermission & requireInstitutionScope enforce tenant and role boundaries', () => {
  const principal: AuthenticatedPrincipal = {
    userId: 'user-1',
    institutionId: 'inst-a',
    roleId: 'role-student',
    permissions: ['student_profile:read_own', 'document:read_own'],
  }

  assert.doesNotThrow(() => requirePermission(principal, 'student_profile:read_own'))
  assert.throws(() => requirePermission(principal, 'record:verify'), AuthorizationError)
  assert.doesNotThrow(() => requireInstitutionScope(principal, 'inst-a'))
  assert.throws(() => requireInstitutionScope(principal, 'inst-b'), AuthorizationError)
})

test('CSV export: escapeCsvCell neutralizes formula injection (CWE-1236)', () => {
  assert.equal(escapeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"`)
  assert.equal(escapeCsvCell('+1+1'), "'+1+1")
  assert.equal(escapeCsvCell('-2+3'), "'-2+3")
  assert.equal(escapeCsvCell('@SUM(A1:A2)'), "'@SUM(A1:A2)")
  assert.equal(escapeCsvCell('Normal, "Quoted"'), '"Normal, ""Quoted"""')

  const csv = buildCsvContent({
    entityType: 'ACHIEVEMENTS',
    title: 'Test',
    subtitle: 'Test',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'count', label: 'Count' },
    ],
    rows: [{ name: '=HYPERLINK("http://evil")', count: 5 }],
    generatedAt: '2026-11-27T00:00:00Z',
  })
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")",5`))
})

test('Auth & Session: resolveActivePrincipalFromRecord blocks disabled/deleted/forced-pw accounts', async () => {
  const { resolveActivePrincipalFromRecord } = await import('../lib/server/current-principal')

  assert.throws(() => resolveActivePrincipalFromRecord(null), AuthenticationRequiredError)
  assert.throws(
    () =>
      resolveActivePrincipalFromRecord({
        id: 'u1',
        institutionId: 'inst-1',
        roleId: 'r1',
        isActive: false,
        mustChangePassword: false,
        role: { key: 'STUDENT', rolePermissions: [] },
      }),
    AuthenticationRequiredError,
  )

  assert.throws(
    () =>
      resolveActivePrincipalFromRecord({
        id: 'u1',
        institutionId: 'inst-1',
        roleId: 'r1',
        isActive: true,
        mustChangePassword: true,
        role: { key: 'STUDENT', rolePermissions: [{ permission: { key: 'student_profile:read_own' } }] },
      }),
    PasswordChangeRequiredError,
  )

  const allowed = resolveActivePrincipalFromRecord(
    {
      id: 'u1',
      institutionId: 'inst-1',
      roleId: 'r1',
      isActive: true,
      mustChangePassword: true,
      role: { key: 'STUDENT', rolePermissions: [{ permission: { key: 'student_profile:read_own' } }] },
    },
    { allowMustChangePassword: true },
  )
  assert.deepEqual(allowed.permissions, ['student_profile:read_own'])
})

test('Documents: canAccessDocument allows owner and same-institution reviewer, denies cross-user & cross-tenant', async () => {
  const { canAccessDocument } = await import('../lib/server/repositories/document-repository')

  const owner: AuthenticatedPrincipal = {
    userId: 'student-1',
    institutionId: 'inst-1',
    roleId: 'role-s',
    permissions: ['document:read_own'],
  }
  const otherStudent: AuthenticatedPrincipal = {
    userId: 'student-2',
    institutionId: 'inst-1',
    roleId: 'role-s',
    permissions: ['document:read_own'],
  }
  const sameInstAdmin: AuthenticatedPrincipal = {
    userId: 'admin-1',
    institutionId: 'inst-1',
    roleId: 'role-a',
    permissions: ['record:verify'],
  }
  const otherInstAdmin: AuthenticatedPrincipal = {
    userId: 'admin-2',
    institutionId: 'inst-2',
    roleId: 'role-a',
    permissions: ['record:verify', 'document:read_own'],
  }

  assert.equal(canAccessDocument({ principal: owner, docInstitutionId: 'inst-1', docOwnerUserId: 'student-1' }), true)
  assert.equal(canAccessDocument({ principal: sameInstAdmin, docInstitutionId: 'inst-1', docOwnerUserId: 'student-1' }), true)
  assert.equal(canAccessDocument({ principal: otherStudent, docInstitutionId: 'inst-1', docOwnerUserId: 'student-1' }), false)
  assert.equal(canAccessDocument({ principal: otherInstAdmin, docInstitutionId: 'inst-1', docOwnerUserId: 'student-1' }), false)
})

test('Verification: validateVerificationTransition blocks self-verification and requires rejection reason', async () => {
  const { validateVerificationTransition } = await import('../lib/server/services/verification')

  assert.throws(
    () =>
      validateVerificationTransition({
        principalUserId: 'user-1',
        ownerUserId: 'user-1',
        status: 'VERIFIED',
      }),
    AuthorizationError,
  )

  assert.throws(
    () =>
      validateVerificationTransition({
        principalUserId: 'admin-1',
        ownerUserId: 'user-1',
        status: 'REJECTED',
        rejectionReason: '   ',
      }),
    /rejection reason/i,
  )

  assert.equal(
    validateVerificationTransition({
      principalUserId: 'admin-1',
      ownerUserId: 'user-1',
      status: 'REJECTED',
      rejectionReason: '  Missing official seal  ',
    }),
    'Missing official seal',
  )

  assert.equal(
    validateVerificationTransition({
      principalUserId: 'admin-1',
      ownerUserId: 'user-1',
      status: 'VERIFIED',
      rejectionReason: 'ignored',
    }),
    null,
  )
})
