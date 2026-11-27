import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { userRowSchema } from './user-import'

export type CreateInstitutionUserInput = z.infer<typeof userRowSchema>

export interface InstitutionUserRepository<TUser, TRole> {
  listUsers(input: { institutionId: string }): Promise<TUser[]>
  listRoles(input: { institutionId: string }): Promise<TRole[]>
  createUser(input: {
    institutionId: string
    data: CreateInstitutionUserInput
  }): Promise<{ user: TUser; temporaryPassword: string }>
  resetPassword(input: {
    institutionId: string
    userId: string
  }): Promise<{ user: TUser; temporaryPassword: string }>
}

function resolveUserManagePermission(principal: AuthenticatedPrincipal): string {
  if (principal.permissions.includes('user:manage')) return 'user:manage'
  if (principal.permissions.includes('department:manage')) return 'department:manage'
  return 'user:import'
}

export async function listInstitutionUsers<TUser, TRole>(input: {
  principal: AuthenticatedPrincipal
  repository: InstitutionUserRepository<TUser, TRole>
}): Promise<TUser[]> {
  requirePermission(input.principal, resolveUserManagePermission(input.principal))
  return input.repository.listUsers({ institutionId: input.principal.institutionId })
}

export async function listInstitutionRoles<TUser, TRole>(input: {
  principal: AuthenticatedPrincipal
  repository: InstitutionUserRepository<TUser, TRole>
}): Promise<TRole[]> {
  requirePermission(input.principal, resolveUserManagePermission(input.principal))
  return input.repository.listRoles({ institutionId: input.principal.institutionId })
}

export async function createInstitutionUser<TUser, TRole>(input: {
  principal: AuthenticatedPrincipal
  repository: InstitutionUserRepository<TUser, TRole>
  data: unknown
}): Promise<{ user: TUser; temporaryPassword: string }> {
  requirePermission(input.principal, resolveUserManagePermission(input.principal))
  const data = userRowSchema.parse(input.data)
  return input.repository.createUser({ institutionId: input.principal.institutionId, data })
}

export async function resetInstitutionUserPassword<TUser, TRole>(input: {
  principal: AuthenticatedPrincipal
  repository: InstitutionUserRepository<TUser, TRole>
  userId: string
}): Promise<{ user: TUser; temporaryPassword: string }> {
  requirePermission(input.principal, resolveUserManagePermission(input.principal))
  return input.repository.resetPassword({
    institutionId: input.principal.institutionId,
    userId: input.userId,
  })
}

const studentIdentitySchema = z.object({
  userId: z.string().min(1),
  enrollmentNumber: z.string().trim().max(60).nullable().optional(),
  departmentId: z.string().trim().nullable().optional(),
  courseId: z.string().trim().nullable().optional(),
  admissionYear: z.coerce.number().int().min(1990).max(2100).nullable().optional(),
  currentSemester: z.coerce.number().int().min(1).max(8).nullable().optional(),
})

const facultyIdentitySchema = z.object({
  userId: z.string().min(1),
  employeeId: z.string().trim().max(60).nullable().optional(),
  departmentId: z.string().trim().nullable().optional(),
  designation: z.string().trim().max(120).nullable().optional(),
  employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'VISITING', 'INACTIVE']).default('ACTIVE'),
  employmentType: z.string().trim().max(60).nullable().optional(),
  joiningDate: z.coerce.date().nullable().optional(),
})

export async function updateStudentInstitutionalIdentity(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<void> {
  requirePermission(input.principal, 'user:manage')
  const { institutionId } = input.principal
  const data = studentIdentitySchema.parse(input.data)
  const enrollmentNumber = data.enrollmentNumber?.trim() || null
  const departmentId = data.departmentId?.trim() || null
  const courseId = data.courseId?.trim() || null

  const targetUser = await prisma.user.findUnique({
    where: { institutionId_id: { institutionId, id: data.userId } },
    select: { id: true, role: { select: { key: true } } },
  })
  if (!targetUser || targetUser.role.key !== 'STUDENT') {
    throw new Error('Student user not found in this institution.')
  }

  if (departmentId) {
    const dept = await prisma.department.findUnique({
      where: { institutionId_id: { institutionId, id: departmentId } },
      select: { id: true },
    })
    if (!dept) throw new Error('Selected department does not belong to this institution.')
  }

  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { institutionId_id: { institutionId, id: courseId } },
      select: { id: true },
    })
    if (!course) throw new Error('Selected course does not belong to this institution.')
  }

  if (enrollmentNumber) {
    const dup = await prisma.studentProfile.findFirst({
      where: {
        institutionId,
        enrollmentNumber: { equals: enrollmentNumber, mode: 'insensitive' },
        userId: { not: data.userId },
      },
      select: { id: true },
    })
    if (dup) {
      throw new Error(`Enrollment number "${enrollmentNumber}" is already assigned to another student.`)
    }
  }

  try {
    await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId, userId: data.userId } },
      create: {
        institutionId,
        userId: data.userId,
        enrollmentNumber,
        departmentId,
        courseId,
        admissionYear: data.admissionYear ?? null,
        currentSemester: data.currentSemester ?? null,
      },
      update: {
        enrollmentNumber,
        departmentId,
        courseId,
        admissionYear: data.admissionYear ?? null,
        currentSemester: data.currentSemester ?? null,
      },
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      throw new Error(`Enrollment number "${enrollmentNumber}" is already assigned to another student.`)
    }
    throw error
  }
}

export async function updateFacultyInstitutionalIdentity(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<void> {
  requirePermission(input.principal, 'user:manage')
  const { institutionId } = input.principal
  const data = facultyIdentitySchema.parse(input.data)
  const employeeId = data.employeeId?.trim() || null
  const departmentId = data.departmentId?.trim() || null
  const designation = data.designation?.trim() || null

  const targetUser = await prisma.user.findUnique({
    where: { institutionId_id: { institutionId, id: data.userId } },
    select: { id: true, role: { select: { key: true } } },
  })
  if (!targetUser || targetUser.role.key !== 'FACULTY') {
    throw new Error('Faculty user not found in this institution.')
  }

  if (departmentId) {
    const dept = await prisma.department.findUnique({
      where: { institutionId_id: { institutionId, id: departmentId } },
      select: { id: true },
    })
    if (!dept) throw new Error('Selected department does not belong to this institution.')
  }

  if (employeeId) {
    const dup = await prisma.facultyProfile.findFirst({
      where: {
        institutionId,
        employeeId: { equals: employeeId, mode: 'insensitive' },
        userId: { not: data.userId },
      },
      select: { id: true },
    })
    if (dup) {
      throw new Error(`Employee ID "${employeeId}" is already assigned to another faculty member.`)
    }
  }

  try {
    await prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId, userId: data.userId } },
      create: {
        institutionId,
        userId: data.userId,
        employeeId,
        departmentId,
        designation,
        employmentStatus: data.employmentStatus,
        employmentType: data.employmentType?.trim() || null,
        joiningDate: data.joiningDate ?? null,
      },
      update: {
        employeeId,
        departmentId,
        designation,
        employmentStatus: data.employmentStatus,
        employmentType: data.employmentType?.trim() || null,
        joiningDate: data.joiningDate ?? null,
      },
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      throw new Error(`Employee ID "${employeeId}" is already assigned to another faculty member.`)
    }
    throw error
  }
}

export async function setInstitutionUserActive(input: {
  principal: AuthenticatedPrincipal
  userId: string
  isActive: boolean
}): Promise<void> {
  requirePermission(input.principal, 'user:manage')
  if (input.userId === input.principal.userId && !input.isActive) {
    throw new Error('You cannot disable your own active administrator account.')
  }
  const existing = await prisma.user.findUnique({
    where: { institutionId_id: { institutionId: input.principal.institutionId, id: input.userId } },
    select: { id: true },
  })
  if (!existing) throw new Error('User not found.')

  await prisma.user.update({
    where: { institutionId_id: { institutionId: input.principal.institutionId, id: input.userId } },
    data: { isActive: input.isActive },
  })
}
