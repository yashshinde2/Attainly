import test from 'node:test'
import assert from 'node:assert/strict'
import { AuthorizationError, requirePermission, type AuthenticatedPrincipal } from '../lib/server/authorization'
import { assertDepartmentAccess } from '../lib/server/services/admin-command'

const coordinatorPrincipal: AuthenticatedPrincipal = {
  userId: 'coord-1',
  institutionId: 'inst-1',
  roleId: 'role-coord',
  permissions: ['record:verify', 'report:view', 'event:create', 'event:enter_results', 'document:read_own'],
}

const adminPrincipal: AuthenticatedPrincipal = {
  userId: 'admin-1',
  institutionId: 'inst-1',
  roleId: 'role-admin',
  permissions: ['record:verify', 'user:manage', 'institution:manage', 'report:view'],
}

test('assertDepartmentAccess allows institution-wide scope when allowedDepartmentIds is null', () => {
  assert.doesNotThrow(() => assertDepartmentAccess(null, 'dept-1'))
  assert.doesNotThrow(() => assertDepartmentAccess(null, null))
})

test('assertDepartmentAccess allows coordinator access to assigned department only', () => {
  assert.doesNotThrow(() => assertDepartmentAccess(['dept-cse'], 'dept-cse'))
  assert.throws(
    () => assertDepartmentAccess(['dept-cse'], 'dept-ece'),
    (err: unknown) => err instanceof AuthorizationError && err.message.includes('department'),
  )
  assert.throws(
    () => assertDepartmentAccess(['dept-cse'], null),
    (err: unknown) => err instanceof AuthorizationError,
  )
})

test('DEPARTMENT_COORDINATOR can verify records and view reports but cannot manage institution users', () => {
  assert.doesNotThrow(() => requirePermission(coordinatorPrincipal, 'record:verify'))
  assert.doesNotThrow(() => requirePermission(coordinatorPrincipal, 'report:view'))
  assert.throws(
    () => requirePermission(coordinatorPrincipal, 'user:manage'),
    (err: unknown) => err instanceof AuthorizationError,
  )
  assert.throws(
    () => requirePermission(coordinatorPrincipal, 'institution:manage'),
    (err: unknown) => err instanceof AuthorizationError,
  )
})

test('ADMIN principal with full permissions passes all Phase 4 permission gates', () => {
  assert.doesNotThrow(() => requirePermission(adminPrincipal, 'record:verify'))
  assert.doesNotThrow(() => requirePermission(adminPrincipal, 'user:manage'))
  assert.doesNotThrow(() => requirePermission(adminPrincipal, 'institution:manage'))
})
