import type { PermissionKey } from '@/lib/server/authorization'

export type PortalType = 'student' | 'faculty' | 'admin'

export interface NavItemConfig {
  label: string
  href: string
  iconKey:
    | 'overview'
    | 'profile'
    | 'academics'
    | 'achievements'
    | 'certifications'
    | 'projects'
    | 'research'
    | 'career'
    | 'events'
    | 'documents'
    | 'resume'
    | 'notifications'
    | 'qualifications'
    | 'experience'
    | 'development'
    | 'consultancy'
    | 'contributions'
    | 'students'
    | 'faculty'
    | 'verifications'
    | 'departments'
    | 'courses'
    | 'reports'
    | 'inspections'
    | 'people'
    | 'settings'
  /** Any-of permission check. If omitted, visible to all users in this portal. */
  requiredAnyPermissions?: PermissionKey[]
}

export interface NavGroupConfig {
  groupLabel: string
  items: NavItemConfig[]
}

export const PORTAL_META: Record<
  PortalType,
  { label: string; searchPlaceholder: string; notificationsHref: string }
> = {
  student: {
    label: 'Student Portal',
    searchPlaceholder: 'Search my documents…',
    notificationsHref: '/student/notifications',
  },
  faculty: {
    label: 'Faculty Portal',
    searchPlaceholder: 'Search my documents…',
    notificationsHref: '/faculty/notifications',
  },
  admin: {
    label: 'Institution Governance',
    searchPlaceholder: 'Search students…',
    notificationsHref: '/admin/verifications',
  },
}

const PORTAL_NAV_GROUPS: Record<PortalType, NavGroupConfig[]> = {
  student: [
    {
      groupLabel: 'Workspace',
      items: [
        { label: 'Overview', href: '/student', iconKey: 'overview' },
        { label: 'My Profile', href: '/student/profile', iconKey: 'profile' },
        { label: 'Academics', href: '/student/academics', iconKey: 'academics' },
      ],
    },
    {
      groupLabel: 'Portfolio & Credentials',
      items: [
        { label: 'Achievements', href: '/student/achievements', iconKey: 'achievements' },
        { label: 'Certifications & Skills', href: '/student/certifications', iconKey: 'certifications' },
        { label: 'Projects & Internships', href: '/student/projects', iconKey: 'projects' },
        { label: 'Research & Innovation', href: '/student/research', iconKey: 'research' },
        { label: 'Career & Placements', href: '/student/career', iconKey: 'career' },
      ],
    },
    {
      groupLabel: 'Campus & Exports',
      items: [
        { label: 'Events', href: '/student/events', iconKey: 'events' },
        { label: 'My Documents', href: '/student/documents', iconKey: 'documents' },
        { label: 'Resume & Portfolio', href: '/student/resume', iconKey: 'resume' },
        { label: 'Notifications', href: '/student/notifications', iconKey: 'notifications' },
      ],
    },
  ],
  faculty: [
    {
      groupLabel: 'Workspace',
      items: [
        { label: 'Overview', href: '/faculty', iconKey: 'overview' },
        { label: 'My Profile', href: '/faculty/profile', iconKey: 'profile' },
        { label: 'Qualifications', href: '/faculty/qualifications', iconKey: 'qualifications' },
        { label: 'Experience & Teaching', href: '/faculty/experience', iconKey: 'experience' },
      ],
    },
    {
      groupLabel: 'Research & Outreach',
      items: [
        { label: 'Professional Development', href: '/faculty/development', iconKey: 'development' },
        { label: 'Research & Innovation', href: '/faculty/research', iconKey: 'research' },
        { label: 'Consultancy', href: '/faculty/consultancy', iconKey: 'consultancy' },
        { label: 'Contributions', href: '/faculty/contributions', iconKey: 'contributions' },
      ],
    },
    {
      groupLabel: 'Campus & Exports',
      items: [
        { label: 'Events', href: '/faculty/events', iconKey: 'events' },
        { label: 'My Documents', href: '/faculty/documents', iconKey: 'documents' },
        { label: 'Academic CV', href: '/faculty/cv', iconKey: 'resume' },
        { label: 'Notifications', href: '/faculty/notifications', iconKey: 'notifications' },
      ],
    },
  ],
  admin: [
    {
      groupLabel: 'Command & Directories',
      items: [
        { label: 'Overview', href: '/admin', iconKey: 'overview', requiredAnyPermissions: ['report:view', 'record:verify'] },
        { label: 'Students', href: '/admin/students', iconKey: 'students', requiredAnyPermissions: ['user:manage', 'report:view', 'record:verify'] },
        { label: 'Faculty', href: '/admin/faculty', iconKey: 'faculty', requiredAnyPermissions: ['user:manage', 'report:view', 'record:verify'] },
        { label: 'Verifications', href: '/admin/verifications', iconKey: 'verifications', requiredAnyPermissions: ['record:verify'] },
      ],
    },
    {
      groupLabel: 'Academics & Events',
      items: [
        { label: 'Departments', href: '/admin/departments', iconKey: 'departments', requiredAnyPermissions: ['department:manage'] },
        { label: 'Courses', href: '/admin/courses', iconKey: 'courses', requiredAnyPermissions: ['course:manage'] },
        { label: 'Events', href: '/admin/events', iconKey: 'events', requiredAnyPermissions: ['event:create', 'event:enter_results'] },
      ],
    },
    {
      groupLabel: 'Evidence & Governance',
      items: [
        { label: 'Reports', href: '/admin/reports', iconKey: 'reports', requiredAnyPermissions: ['report:view'] },
        { label: 'Document Vault', href: '/admin/documents', iconKey: 'documents', requiredAnyPermissions: ['report:view', 'record:verify'] },
        { label: 'Inspections', href: '/admin/inspections', iconKey: 'inspections', requiredAnyPermissions: ['report:view'] },
        { label: 'Users & Access', href: '/admin/people', iconKey: 'people', requiredAnyPermissions: ['user:manage', 'user:import'] },
        { label: 'Settings', href: '/admin/settings', iconKey: 'settings', requiredAnyPermissions: ['institution:manage'] },
      ],
    },
  ],
}

/**
 * Filters grouped portal navigation items by the signed-in user's actual permissions.
 * Frontend link hiding is paired with server-side authorization on every route & action.
 */
export function filterNavGroupsByPermissions(
  portal: PortalType,
  permissions: readonly PermissionKey[],
): NavGroupConfig[] {
  const permSet = new Set(permissions)
  return PORTAL_NAV_GROUPS[portal]
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.requiredAnyPermissions ||
          item.requiredAnyPermissions.some((req) => permSet.has(req)),
      ),
    }))
    .filter((group) => group.items.length > 0)
}
