import 'server-only'
import { readFile, rm } from 'node:fs/promises'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '@/lib/server/authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { allocateUniqueArchivePath, StreamingZipWriter } from '@/lib/server/streaming-zip'
import { escapeCsvCell } from '@/lib/csv'

export async function buildBulkDossierZip(input: {
  principal: AuthenticatedPrincipal
  targetType: 'STUDENT' | 'FACULTY'
  userIds: string[]
}): Promise<{ buffer: Buffer; filename: string; exportedCount: number }> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)
  const uniqueIds = [...new Set(input.userIds)].filter(Boolean).slice(0, 100)
  if (uniqueIds.length === 0) {
    throw new Error('Select at least one person to export.')
  }

  const usedPaths = new Set<string>()
  const writer = new StreamingZipWriter('attainly-dossiers')
  let exportedCount = 0

  try {
    if (input.targetType === 'STUDENT') {
      const profiles = await prisma.studentProfile.findMany({
        where: { institutionId, userId: { in: uniqueIds } },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          department: { select: { code: true, name: true } },
          course: { select: { code: true, name: true } },
          semesterRecords: true,
          achievements: true,
          certifications: true,
          internships: true,
          placementOffers: true,
        },
      })
      for (const p of profiles) {
        assertDepartmentAccess(allowedDepts, p.departmentId)
      }

      const csvLines = ['Name,Email,EnrollmentNumber,Department,Semester,Status,Achievements,Certifications,Internships']
      for (const p of profiles) {
        const name = `${p.user.firstName} ${p.user.lastName}`
        csvLines.push(
          [
            name,
            p.user.email,
            p.enrollmentNumber ?? '',
            p.department?.code ?? 'Unassigned',
            p.currentSemester ?? '',
            p.academicStatus,
            p.achievements.length,
            p.certifications.length,
            p.internships.length,
          ]
            .map(escapeCsvCell)
            .join(','),
        )
        const entryName = allocateUniqueArchivePath(
          ['students'],
          `${p.enrollmentNumber ?? p.userId}.json`,
          usedPaths,
        )
        await writer.addBuffer(entryName, Buffer.from(JSON.stringify(p, null, 2), 'utf8'))
        exportedCount += 1
      }
      await writer.addBuffer('students-summary.csv', Buffer.from(csvLines.join('\n'), 'utf8'))
    } else {
      const profiles = await prisma.facultyProfile.findMany({
        where: { institutionId, userId: { in: uniqueIds } },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          department: { select: { code: true, name: true } },
          education: true,
          developmentPrograms: true,
          researchGrants: true,
          consultancies: true,
          contributions: true,
        },
      })
      for (const p of profiles) {
        assertDepartmentAccess(allowedDepts, p.departmentId)
      }

      const csvLines = ['Name,Email,EmployeeId,Department,Designation,Status,FDPs,Grants,Consultancies']
      for (const p of profiles) {
        const name = `${p.user.firstName} ${p.user.lastName}`
        csvLines.push(
          [
            name,
            p.user.email,
            p.employeeId ?? '',
            p.department?.code ?? 'Unassigned',
            p.designation ?? '',
            p.employmentStatus,
            p.developmentPrograms.length,
            p.researchGrants.length,
            p.consultancies.length,
          ]
            .map(escapeCsvCell)
            .join(','),
        )
        const entryName = allocateUniqueArchivePath(
          ['faculty'],
          `${p.employeeId ?? p.userId}.json`,
          usedPaths,
        )
        await writer.addBuffer(entryName, Buffer.from(JSON.stringify(p, null, 2), 'utf8'))
        exportedCount += 1
      }
      await writer.addBuffer('faculty-summary.csv', Buffer.from(csvLines.join('\n'), 'utf8'))
    }

    await writer.finalize()
    const buffer = await readFile(writer.filePath)
    return {
      buffer,
      filename: `attainly-${input.targetType.toLowerCase()}-dossiers-${new Date().toISOString().slice(0, 10)}.zip`,
      exportedCount,
    }
  } finally {
    await rm(writer.filePath, { force: true }).catch(() => {})
  }
}
