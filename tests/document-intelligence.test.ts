import test from 'node:test'
import assert from 'node:assert/strict'
import { canAccessDocument } from '../lib/server/repositories/document-repository'
import type { AuthenticatedPrincipal } from '../lib/server/authorization'

test('Phase 11B: document access enforces strict owner, tenant, and department boundaries', () => {
  const studentA: AuthenticatedPrincipal = {
    userId: 'stu-a',
    institutionId: 'inst-1',
    roleId: 'role-stu',
    permissions: ['document:read_own', 'document:upload'],
  }
  const studentB: AuthenticatedPrincipal = {
    userId: 'stu-b',
    institutionId: 'inst-1',
    roleId: 'role-stu',
    permissions: ['document:read_own', 'document:upload'],
  }
  const coordDept1: AuthenticatedPrincipal = {
    userId: 'coord-1',
    institutionId: 'inst-1',
    roleId: 'role-coord',
    permissions: ['record:verify', 'report:view', 'document:read_own'],
  }

  // Owner can access own document
  assert.equal(
    canAccessDocument({
      principal: studentA,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-a',
    }),
    true,
  )

  // Another student in same institution cannot access studentA's document
  assert.equal(
    canAccessDocument({
      principal: studentB,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-a',
    }),
    false,
  )

  // Cross-tenant reviewer denied
  assert.equal(
    canAccessDocument({
      principal: { ...coordDept1, institutionId: 'inst-2' },
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-a',
      allowedDepartmentIds: null,
    }),
    false,
  )

  // Department coordinator allowed only for assigned department
  assert.equal(
    canAccessDocument({
      principal: coordDept1,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-a',
      allowedDepartmentIds: ['dept-cse'],
      docDepartmentId: 'dept-cse',
    }),
    true,
  )
  assert.equal(
    canAccessDocument({
      principal: coordDept1,
      docInstitutionId: 'inst-1',
      docOwnerUserId: 'stu-a',
      allowedDepartmentIds: ['dept-cse'],
      docDepartmentId: 'dept-ece',
    }),
    false,
  )
})
