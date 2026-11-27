import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveSessionCookieTarget } from '../lib/server/session-cookie'
import { canAccessDocument } from '../lib/server/repositories/document-repository'
import type { AuthenticatedPrincipal } from '../lib/server/authorization'

test('AUD-01: resolveSessionCookieTarget selects plain HTTP cookie when local production runs over http://localhost', () => {
  const httpLocal = resolveSessionCookieTarget({
    hasSecureCookie: false,
    hasPlainCookie: true,
    nextAuthUrl: 'http://localhost:3000',
  })
  assert.equal(httpLocal.cookieName, 'next-auth.session-token')
  assert.equal(httpLocal.secure, false)

  const httpsProd = resolveSessionCookieTarget({
    hasSecureCookie: true,
    hasPlainCookie: false,
    nextAuthUrl: 'https://attainly.example.edu',
  })
  assert.equal(httpsProd.cookieName, '__Secure-next-auth.session-token')
  assert.equal(httpsProd.secure, true)
})

test('AUD-02: canAccessDocument restricts DEPARTMENT_COORDINATOR to assigned departments and blocks cross-dept/cross-tenant', () => {
  const coordCse: AuthenticatedPrincipal = {
    userId: 'coord-cse',
    institutionId: 'inst-1',
    roleId: 'role-coord',
    permissions: ['record:verify', 'document:read_own'],
  }
  const instAdmin: AuthenticatedPrincipal = {
    userId: 'admin-1',
    institutionId: 'inst-1',
    roleId: 'role-admin',
    permissions: ['record:verify', 'document:read_own'],
  }

  // Coordinator CAN access document in their assigned department (CSE)
  assert.equal(
    canAccessDocument({
      principal: coordCse,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-cse-1',
      allowedDepartmentIds: ['dept-cse'],
      docDepartmentId: 'dept-cse',
    }),
    true,
  )

  // Coordinator CANNOT access document in another department (ECE) even with record:verify
  assert.equal(
    canAccessDocument({
      principal: coordCse,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-ece-1',
      allowedDepartmentIds: ['dept-cse'],
      docDepartmentId: 'dept-ece',
    }),
    false,
  )

  // Coordinator CANNOT access document with unknown/null department (deny by default)
  assert.equal(
    canAccessDocument({
      principal: coordCse,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-unassigned',
      allowedDepartmentIds: ['dept-cse'],
      docDepartmentId: null,
    }),
    false,
  )

  // Coordinator CANNOT access document in another institution even with matching dept ID
  assert.equal(
    canAccessDocument({
      principal: coordCse,
      docInstitutionId: 'inst-2',
      docOwnerUserId: 'stu-cse-1',
      allowedDepartmentIds: ['dept-cse'],
      docDepartmentId: 'dept-cse',
    }),
    false,
  )

  // Institution Admin (allowedDepartmentIds: null) CAN access same-institution documents
  assert.equal(
    canAccessDocument({
      principal: instAdmin,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-ece-1',
      allowedDepartmentIds: null,
      docDepartmentId: 'dept-ece',
    }),
    true,
  )
})
