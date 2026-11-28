import 'server-only'
import { prisma } from '@/lib/server/db'
import type { AuthenticatedPrincipal } from '@/lib/server/authorization'
import { resolveDepartmentScope } from './admin-command'

export interface GlobalSearchResultItem {
  id: string
  category: 'STUDENT' | 'FACULTY' | 'EVENT' | 'RECORD' | 'DOCUMENT'
  title: string
  subtitle: string
  href: string
}

export async function runGlobalSearch(
  principal: AuthenticatedPrincipal,
  rawQuery: string,
): Promise<GlobalSearchResultItem[]> {
  const q = rawQuery.trim()
  if (q.length < 2) return []

  const { institutionId, userId, permissions } = principal
  const isAdminOrVerifier =
    permissions.includes('user:manage') ||
    permissions.includes('report:view') ||
    permissions.includes('record:verify')

  const allowedDepts = isAdminOrVerifier ? await resolveDepartmentScope(principal) : null
  const results: GlobalSearchResultItem[] = []

  if (isAdminOrVerifier) {
    const [students, faculties, events, documents] = await Promise.all([
      prisma.studentProfile.findMany({
        where: {
          institutionId,
          ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
          OR: [
            { enrollmentNumber: { contains: q, mode: 'insensitive' } },
            { user: { firstName: { contains: q, mode: 'insensitive' } } },
            { user: { lastName: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: {
          userId: true,
          enrollmentNumber: true,
          department: { select: { code: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.facultyProfile.findMany({
        where: {
          institutionId,
          ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
          OR: [
            { employeeId: { contains: q, mode: 'insensitive' } },
            { user: { firstName: { contains: q, mode: 'insensitive' } } },
            { user: { lastName: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: {
          userId: true,
          employeeId: true,
          designation: true,
          department: { select: { code: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.event.findMany({
        where: {
          institutionId,
          ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
          title: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, title: true, startsAt: true, department: { select: { code: true } } },
      }),
      prisma.document.findMany({
        where: {
          institutionId,
          originalFilename: { contains: q, mode: 'insensitive' },
          ...(allowedDepts
            ? {
                owner: {
                  OR: [
                    { student: { departmentId: { in: allowedDepts } } },
                    { faculty: { departmentId: { in: allowedDepts } } },
                  ],
                },
              }
            : {}),
        },
        take: 5,
        select: { id: true, originalFilename: true, mimeType: true },
      }),
    ])

    for (const s of students) {
      results.push({
        id: s.userId,
        category: 'STUDENT',
        title: `${s.user.firstName} ${s.user.lastName}`,
        subtitle: `${s.enrollmentNumber ?? s.user.email} · ${s.department?.code ?? 'Unassigned'}`,
        href: `/admin/students/${s.userId}`,
      })
    }
    for (const f of faculties) {
      results.push({
        id: f.userId,
        category: 'FACULTY',
        title: `${f.user.firstName} ${f.user.lastName}`,
        subtitle: `${f.employeeId ?? f.designation ?? 'Faculty'} · ${f.department?.code ?? 'Unassigned'}`,
        href: `/admin/faculty/${f.userId}`,
      })
    }
    for (const e of events) {
      results.push({
        id: e.id,
        category: 'EVENT',
        title: e.title,
        subtitle: `${e.department.code} · ${e.startsAt.toISOString().slice(0, 10)}`,
        href: '/admin/events',
      })
    }
    for (const d of documents) {
      results.push({
        id: d.id,
        category: 'DOCUMENT',
        title: d.originalFilename,
        subtitle: d.mimeType,
        href: `/admin/documents?search=${encodeURIComponent(d.originalFilename)}`,
      })
    }
    return results
  }

  // Student or Faculty self-scoped search
  const isFaculty = permissions.includes('faculty_profile:read_own')
  const [docs, events] = await Promise.all([
    prisma.document.findMany({
      where: {
        institutionId,
        ownerUserId: userId,
        originalFilename: { contains: q, mode: 'insensitive' },
      },
      take: 6,
      select: { id: true, originalFilename: true, mimeType: true },
    }),
    prisma.event.findMany({
      where: {
        institutionId,
        title: { contains: q, mode: 'insensitive' },
      },
      take: 4,
      select: { id: true, title: true, startsAt: true },
    }),
  ])

  for (const d of docs) {
    results.push({
      id: d.id,
      category: 'DOCUMENT',
      title: d.originalFilename,
      subtitle: d.mimeType,
      href: `${isFaculty ? '/faculty/documents' : '/student/documents'}?q=${encodeURIComponent(d.originalFilename)}`,
    })
  }
  for (const e of events) {
    results.push({
      id: e.id,
      category: 'EVENT',
      title: e.title,
      subtitle: e.startsAt.toISOString().slice(0, 10),
      href: isFaculty ? '/faculty/events' : '/student/events',
    })
  }
  return results
}
