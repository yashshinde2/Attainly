import test from 'node:test'
import assert from 'node:assert/strict'
import { filterNavGroupsByPermissions } from '../lib/portal-navigation'

test('Phase 10A: DEPARTMENT_COORDINATOR does not see Departments, Courses, Users & Access, or Settings links', () => {
  const coordinatorPermissions = [
    'record:verify',
    'report:view',
    'event:create',
    'event:enter_results',
    'document:read_own',
  ]
  const groups = filterNavGroupsByPermissions('admin', coordinatorPermissions)
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.href))

  assert.ok(hrefs.includes('/admin'))
  assert.ok(hrefs.includes('/admin/verifications'))
  assert.ok(hrefs.includes('/admin/events'))
  assert.ok(hrefs.includes('/admin/reports'))
  assert.ok(!hrefs.includes('/admin/departments'), 'Coordinator must not see /admin/departments')
  assert.ok(!hrefs.includes('/admin/courses'), 'Coordinator must not see /admin/courses')
  assert.ok(!hrefs.includes('/admin/people'), 'Coordinator must not see /admin/people')
  assert.ok(!hrefs.includes('/admin/settings'), 'Coordinator must not see /admin/settings')
})

test('Phase 10A: INSTITUTION_ADMIN sees full admin governance navigation', () => {
  const adminPermissions = [
    'department:manage',
    'course:manage',
    'institution:manage',
    'user:manage',
    'user:import',
    'event:create',
    'event:archive',
    'event:enter_results',
    'record:verify',
    'report:view',
  ]
  const groups = filterNavGroupsByPermissions('admin', adminPermissions)
  const hrefs = groups.flatMap((g) => g.items.map((i) => i.href))

  assert.ok(hrefs.includes('/admin/departments'))
  assert.ok(hrefs.includes('/admin/courses'))
  assert.ok(hrefs.includes('/admin/people'))
  assert.ok(hrefs.includes('/admin/settings'))
})
