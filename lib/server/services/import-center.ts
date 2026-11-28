import 'server-only'
import { hash } from 'bcryptjs'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/server/db'
import {
  AuthorizationError,
  requirePermission,
  type AuthenticatedPrincipal,
} from '@/lib/server/authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { invalidateInstitutionOverviewCache } from '@/lib/server/overview-cache'
import { generateTemporaryPassword } from '@/lib/server/password'
import {
  IMPORT_CATALOG,
  isImportTypeKey,
  suggestColumnMapping,
  type ImportTypeKey,
} from '@/lib/import-types'
import {
  buildImportErrorReportCsv,
  parseSpreadsheetBuffer,
} from '@/lib/server/import-parsers'
import {
  applyColumnMapping,
  validateImportRow,
} from '@/lib/server/import-validators'

const BATCH_SIZE = 100
export const IMPORT_SYNC_ROW_THRESHOLD = 250

export type ConflictMode = 'CREATE_ONLY' | 'UPDATE_EXISTING' | 'SKIP_EXISTING'

export function assertCanAccessImportCenter(principal: AuthenticatedPrincipal): void {
  const hasAdminImport =
    principal.permissions.includes('user:import') ||
    principal.permissions.includes('user:manage') ||
    principal.permissions.includes('institution:manage')
  const hasDeptCoord =
    principal.permissions.includes('record:verify') &&
    principal.permissions.includes('report:view')

  if (!hasAdminImport && !hasDeptCoord) {
    throw new AuthorizationError('Missing permission to access the Institutional Import Center.')
  }
}

export interface StagedImportPreview {
  jobId: string
  importType: ImportTypeKey
  fileName: string
  fileFormat: 'CSV' | 'XLSX'
  headers: string[]
  columnMapping: Record<string, string>
  totalRows: number
  validRows: number
  invalidRows: number
  previewSummary: {
    willCreate: number
    willUpdate: number
    willSkip: number
    invalid: number
  }
  previewRows: Array<{
    rowNumber: number
    status: string
    actionPreview: 'CREATE' | 'UPDATE' | 'SKIP' | 'INVALID'
    matchKey: string | null
    errorMessage: string | null
    rawPayload: Record<string, string>
  }>
  duplicateFileWarning?: string
}

interface LookupContext {
  institutionId: string
  allowedDepts: string[] | null
  deptByCode: Map<string, { id: string; code: string; name: string }>
  courseByCode: Map<string, { id: string; code: string; departmentId: string }>
  studentByEnrollment: Map<string, { id: string; userId: string; departmentId: string | null; enrollmentNumber: string | null }>
  studentByEmail: Map<string, { id: string; userId: string; departmentId: string | null; enrollmentNumber: string | null }>
  facultyByEmployeeId: Map<string, { id: string; userId: string; departmentId: string | null; employeeId: string | null }>
  facultyByEmail: Map<string, { id: string; userId: string; departmentId: string | null; employeeId: string | null }>
  roleIdByKey: Map<string, string>
}

async function buildLookupContext(
  principal: AuthenticatedPrincipal,
  importType: ImportTypeKey,
  normalizedRows: Array<Record<string, unknown>>,
): Promise<LookupContext> {
  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)

  if (allowedDepts !== null && IMPORT_CATALOG[importType].adminOnly) {
    throw new AuthorizationError(
      `Import type "${IMPORT_CATALOG[importType].label}" requires institution-wide administrator privileges.`,
    )
  }

  const enrollmentKeys = new Set<string>()
  const employeeKeys = new Set<string>()
  const emailKeys = new Set<string>()

  for (const row of normalizedRows) {
    if (typeof row.enrollmentNumber === 'string' && row.enrollmentNumber) {
      enrollmentKeys.add(row.enrollmentNumber)
    }
    if (typeof row.employeeId === 'string' && row.employeeId) {
      employeeKeys.add(row.employeeId)
    }
    if (typeof row.email === 'string' && row.email) {
      emailKeys.add(row.email.toLowerCase())
    }
    if (row.ownerType === 'STUDENT' && typeof row.ownerIdentifier === 'string') {
      enrollmentKeys.add(row.ownerIdentifier)
    }
    if (row.ownerType === 'FACULTY' && typeof row.ownerIdentifier === 'string') {
      employeeKeys.add(row.ownerIdentifier)
    }
  }

  const [departments, courses, roles, students, faculties] = await Promise.all([
    prisma.department.findMany({
      where: { institutionId },
      select: { id: true, code: true, name: true },
    }),
    prisma.course.findMany({
      where: { institutionId },
      select: { id: true, code: true, departmentId: true },
    }),
    prisma.role.findMany({
      where: { institutionId, key: { in: ['STUDENT', 'FACULTY'] } },
      select: { id: true, key: true },
    }),
    enrollmentKeys.size > 0 || emailKeys.size > 0
      ? prisma.studentProfile.findMany({
          where: {
            institutionId,
            OR: [
              ...(enrollmentKeys.size > 0 ? [{ enrollmentNumber: { in: [...enrollmentKeys] } }] : []),
              ...(emailKeys.size > 0 ? [{ user: { email: { in: [...emailKeys] } } }] : []),
            ],
          },
          select: {
            id: true,
            userId: true,
            departmentId: true,
            enrollmentNumber: true,
            user: { select: { email: true } },
          },
        })
      : Promise.resolve([]),
    employeeKeys.size > 0 || emailKeys.size > 0
      ? prisma.facultyProfile.findMany({
          where: {
            institutionId,
            OR: [
              ...(employeeKeys.size > 0 ? [{ employeeId: { in: [...employeeKeys] } }] : []),
              ...(emailKeys.size > 0 ? [{ user: { email: { in: [...emailKeys] } } }] : []),
            ],
          },
          select: {
            id: true,
            userId: true,
            departmentId: true,
            employeeId: true,
            user: { select: { email: true } },
          },
        })
      : Promise.resolve([]),
  ])

  const deptByCode = new Map(departments.map((d) => [d.code.toUpperCase(), d]))
  const courseByCode = new Map(courses.map((c) => [c.code.toUpperCase(), c]))
  const roleIdByKey = new Map(roles.map((r) => [r.key, r.id]))

  const studentByEnrollment = new Map<string, { id: string; userId: string; departmentId: string | null; enrollmentNumber: string | null }>()
  const studentByEmail = new Map<string, { id: string; userId: string; departmentId: string | null; enrollmentNumber: string | null }>()
  for (const s of students) {
    const info = { id: s.id, userId: s.userId, departmentId: s.departmentId, enrollmentNumber: s.enrollmentNumber }
    if (s.enrollmentNumber) studentByEnrollment.set(s.enrollmentNumber.toUpperCase(), info)
    if (s.user?.email) studentByEmail.set(s.user.email.toLowerCase(), info)
  }

  const facultyByEmployeeId = new Map<string, { id: string; userId: string; departmentId: string | null; employeeId: string | null }>()
  const facultyByEmail = new Map<string, { id: string; userId: string; departmentId: string | null; employeeId: string | null }>()
  for (const f of faculties) {
    const info = { id: f.id, userId: f.userId, departmentId: f.departmentId, employeeId: f.employeeId }
    if (f.employeeId) facultyByEmployeeId.set(f.employeeId.toUpperCase(), info)
    if (f.user?.email) facultyByEmail.set(f.user.email.toLowerCase(), info)
  }

  return {
    institutionId,
    allowedDepts,
    deptByCode,
    courseByCode,
    studentByEnrollment,
    studentByEmail,
    facultyByEmployeeId,
    facultyByEmail,
    roleIdByKey,
  }
}

function resolveStudentOrThrow(ctx: LookupContext, enrollmentNumber: string) {
  const student = ctx.studentByEnrollment.get(enrollmentNumber.toUpperCase())
  if (!student) {
    throw new Error(`Student with enrollment number "${enrollmentNumber}" not found in this institution.`)
  }
  assertDepartmentAccess(ctx.allowedDepts, student.departmentId)
  return student
}

function resolveFacultyOrThrow(ctx: LookupContext, employeeId: string) {
  const faculty = ctx.facultyByEmployeeId.get(employeeId.toUpperCase())
  if (!faculty) {
    throw new Error(`Faculty with employee ID "${employeeId}" not found in this institution.`)
  }
  assertDepartmentAccess(ctx.allowedDepts, faculty.departmentId)
  return faculty
}

function checkRowReferencesAndScope(
  importType: ImportTypeKey,
  norm: Record<string, unknown>,
  ctx: LookupContext,
): { existsLikely: boolean } {
  switch (importType) {
    case 'STUDENT_IDENTITY': {
      const deptCode = String(norm.departmentCode)
      const dept = ctx.deptByCode.get(deptCode)
      if (!dept) throw new Error(`Department code "${deptCode}" does not exist in this institution.`)
      assertDepartmentAccess(ctx.allowedDepts, dept.id)
      const courseCode = norm.courseCode ? String(norm.courseCode) : null
      if (courseCode) {
        const course = ctx.courseByCode.get(courseCode)
        if (!course) throw new Error(`Course code "${courseCode}" does not exist.`)
        if (course.departmentId !== dept.id) {
          throw new Error(`Course "${courseCode}" does not belong to department "${deptCode}".`)
        }
      }
      const existing =
        ctx.studentByEnrollment.get(String(norm.enrollmentNumber)) ??
        ctx.studentByEmail.get(String(norm.email))
      if (existing) assertDepartmentAccess(ctx.allowedDepts, existing.departmentId)
      return { existsLikely: Boolean(existing) }
    }
    case 'FACULTY_IDENTITY': {
      const deptCode = String(norm.departmentCode)
      const dept = ctx.deptByCode.get(deptCode)
      if (!dept) throw new Error(`Department code "${deptCode}" does not exist in this institution.`)
      assertDepartmentAccess(ctx.allowedDepts, dept.id)
      const existing =
        ctx.facultyByEmployeeId.get(String(norm.employeeId)) ??
        ctx.facultyByEmail.get(String(norm.email))
      return { existsLikely: Boolean(existing) }
    }
    case 'STUDENT_EDUCATION':
    case 'SEMESTER_RECORD':
    case 'ACHIEVEMENT':
    case 'CERTIFICATION':
    case 'PROJECT_INTERNSHIP':
    case 'PLACEMENT_OUTCOME': {
      resolveStudentOrThrow(ctx, String(norm.enrollmentNumber))
      return { existsLikely: false }
    }
    case 'FACULTY_QUALIFICATION':
    case 'FACULTY_EXPERIENCE':
    case 'FACULTY_FDP':
    case 'RESEARCH_PUBLICATION':
    case 'CONSULTANCY_CONTRIBUTION':
    case 'TEACHING_WORKLOAD': {
      resolveFacultyOrThrow(ctx, String(norm.employeeId))
      return { existsLikely: false }
    }
    case 'PATENT': {
      if (norm.ownerType === 'STUDENT') {
        resolveStudentOrThrow(ctx, String(norm.ownerIdentifier))
      } else {
        resolveFacultyOrThrow(ctx, String(norm.ownerIdentifier))
      }
      return { existsLikely: false }
    }
  }
}

export async function stageImportJob(input: {
  principal: AuthenticatedPrincipal
  importType: string
  fileName: string
  fileBuffer: Buffer
  conflictMode?: ConflictMode
  trustedProvenance?: boolean
  columnMapping?: Record<string, string>
}): Promise<StagedImportPreview> {
  assertCanAccessImportCenter(input.principal)
  if (!isImportTypeKey(input.importType)) {
    throw new Error(`Unsupported import type: ${input.importType}`)
  }
  const importType = input.importType
  const def = IMPORT_CATALOG[importType]
  const conflictMode: ConflictMode = input.conflictMode ?? 'SKIP_EXISTING'

  const trustedProvenance = Boolean(input.trustedProvenance)
  if (trustedProvenance) {
    if (!def.supportsTrustedProvenance) {
      throw new Error(`${def.label} does not use verification provenance.`)
    }
    requirePermission(input.principal, 'record:verify')
  }

  const parsed = await parseSpreadsheetBuffer(input.fileBuffer, input.fileName)
  const columnMapping =
    input.columnMapping && Object.keys(input.columnMapping).length > 0
      ? input.columnMapping
      : suggestColumnMapping(importType, parsed.headers)

  // First pass: pure validation & duplicate detection within file
  const seenMatchKeys = new Map<string, number>()
  const stagedRows: Array<{
    rowNumber: number
    rawPayload: Record<string, string>
    matchKey: string | null
    normalized: Record<string, unknown> | null
    errorMessage: string | null
  }> = []

  const validNorms: Array<Record<string, unknown>> = []

  for (let i = 0; i < parsed.rows.length; i += 1) {
    const rowNumber = i + 2 // 1-indexed header + row
    const rawPayload = parsed.rows[i]
    try {
      const mapped = applyColumnMapping(rawPayload, columnMapping, importType)
      const validated = validateImportRow(importType, mapped)
      const priorRow = seenMatchKeys.get(validated.matchKey)
      if (priorRow !== undefined) {
        throw new Error(`Duplicate record identifier within file (matches row ${priorRow}).`)
      }
      seenMatchKeys.set(validated.matchKey, rowNumber)
      validNorms.push(validated.normalized)
      stagedRows.push({
        rowNumber,
        rawPayload,
        matchKey: validated.matchKey,
        normalized: validated.normalized,
        errorMessage: null,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid row data.'
      stagedRows.push({
        rowNumber,
        rawPayload,
        matchKey: null,
        normalized: null,
        errorMessage: msg,
      })
    }
  }

  // Second pass: institution-scoped reference & department-scope validation
  const ctx = await buildLookupContext(input.principal, importType, validNorms)
  let willCreate = 0
  let willUpdate = 0
  let willSkip = 0
  let invalid = 0

  const previewRows: StagedImportPreview['previewRows'] = []

  for (const row of stagedRows) {
    let actionPreview: 'CREATE' | 'UPDATE' | 'SKIP' | 'INVALID' = 'INVALID'
    if (!row.errorMessage && row.normalized) {
      try {
        const ref = checkRowReferencesAndScope(importType, row.normalized, ctx)
        if (ref.existsLikely) {
          if (conflictMode === 'UPDATE_EXISTING') {
            actionPreview = 'UPDATE'
            willUpdate += 1
          } else if (conflictMode === 'SKIP_EXISTING') {
            actionPreview = 'SKIP'
            willSkip += 1
          } else {
            row.errorMessage = 'Record already exists (CREATE_ONLY mode).'
            invalid += 1
          }
        } else {
          actionPreview = 'CREATE'
          willCreate += 1
        }
      } catch (err) {
        row.errorMessage = err instanceof Error ? err.message : 'Reference check failed.'
        row.normalized = null
        invalid += 1
      }
    } else {
      invalid += 1
    }

    if (previewRows.length < 50) {
      previewRows.push({
        rowNumber: row.rowNumber,
        status: row.errorMessage ? 'INVALID' : 'VALID',
        actionPreview,
        matchKey: row.matchKey,
        errorMessage: row.errorMessage,
        rawPayload: row.rawPayload,
      })
    }
  }

  const validRows = stagedRows.length - invalid

  const existingDuplicateJob = await prisma.importJob.findFirst({
    where: {
      institutionId: input.principal.institutionId,
      importType,
      status: { in: ['COMPLETED', 'PARTIALLY_FAILED'] },
      idempotencyKey: { startsWith: `${importType}:${parsed.fileSha256}:` },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, createdCount: true },
  })

  const job = await prisma.importJob.create({
    data: {
      institutionId: input.principal.institutionId,
      requestedByUserId: input.principal.userId,
      importType,
      fileName: input.fileName,
      fileFormat: parsed.format,
      conflictMode,
      trustProvenance: trustedProvenance ? 'INSTITUTIONAL_TRUSTED' : 'SELF_REPORTED',
      status: 'VALIDATED',
      idempotencyKey: `${importType}:${parsed.fileSha256}:${Date.now()}`,
      columnMappingJson: columnMapping as Prisma.InputJsonValue,
      totalRows: stagedRows.length,
      validRows,
      invalidRows: invalid,
      summaryJson: {
        fileSha256: parsed.fileSha256,
        willCreate,
        willUpdate,
        willSkip,
        invalid,
      } as Prisma.InputJsonValue,
    },
  })

  for (let i = 0; i < stagedRows.length; i += 250) {
    const chunk = stagedRows.slice(i, i + 250)
    await prisma.importJobRow.createMany({
      data: chunk.map((r) => ({
        institutionId: input.principal.institutionId,
        importJobId: job.id,
        rowNumber: r.rowNumber,
        status: r.errorMessage ? 'INVALID' : 'VALID',
        matchKey: r.matchKey,
        rawPayloadJson: r.rawPayload as Prisma.InputJsonValue,
        normalizedJson: (r.normalized ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        errorMessage: r.errorMessage,
      })),
    })
  }

  return {
    jobId: job.id,
    importType,
    fileName: input.fileName,
    fileFormat: parsed.format,
    headers: parsed.headers,
    columnMapping,
    totalRows: stagedRows.length,
    validRows,
    invalidRows: invalid,
    previewSummary: { willCreate, willUpdate, willSkip, invalid },
    previewRows,
    duplicateFileWarning: existingDuplicateJob
      ? `This exact file was previously imported on ${existingDuplicateJob.createdAt.toISOString().slice(0, 10)} (${existingDuplicateJob.createdCount} created). Rerunning will match existing records.`
      : undefined,
  }
}

export async function confirmImportJob(input: {
  principal: AuthenticatedPrincipal
  jobId: string
  runInBackground?: boolean
}) {
  assertCanAccessImportCenter(input.principal)
  const job = await prisma.importJob.findUnique({
    where: { institutionId_id: { institutionId: input.principal.institutionId, id: input.jobId } },
  })
  if (!job) throw new Error('Import job not found.')
  if (job.status !== 'VALIDATED') {
    throw new Error(`Import job cannot be confirmed from status ${job.status}.`)
  }
  if (job.validRows === 0) {
    throw new Error('Cannot execute import: 0 valid rows in staged job.')
  }

  await prisma.importJob.update({
    where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
    data: { status: 'QUEUED' },
  })

  const shouldBackground =
    input.runInBackground ?? job.validRows > IMPORT_SYNC_ROW_THRESHOLD

  if (shouldBackground) {
    return prisma.importJob.findUnique({
      where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
    })
  }

  return processImportJob({
    institutionId: job.institutionId,
    id: job.id,
    actorPrincipal: input.principal,
  })
}

export async function claimNextQueuedImportJob(targetJobId?: string) {
  const candidates = await prisma.importJob.findMany({
    where: {
      status: 'QUEUED',
      ...(targetJobId ? { id: targetJobId } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  })

  for (const candidate of candidates) {
    const claimed = await prisma.importJob.updateMany({
      where: { institutionId: candidate.institutionId, id: candidate.id, status: 'QUEUED' },
      data: { status: 'PROCESSING', startedAt: new Date() },
    })
    if (claimed.count === 1) {
      return candidate
    }
  }
  return null
}

async function resolvePrincipalForJob(institutionId: string, userId: string): Promise<AuthenticatedPrincipal> {
  const user = await prisma.user.findUnique({
    where: { institutionId_id: { institutionId, id: userId } },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  })
  if (!user) throw new Error('Import job requester user no longer exists.')
  return {
    userId: user.id,
    institutionId: user.institutionId,
    roleId: user.roleId,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
  }
}

async function applySingleImportRow(input: {
  ctx: LookupContext
  principal: AuthenticatedPrincipal
  importType: ImportTypeKey
  conflictMode: ConflictMode
  trustedProvenance: boolean
  norm: Record<string, unknown>
}): Promise<{ outcome: 'CREATED' | 'UPDATED' | 'SKIPPED'; targetModel: string; targetRecordId: string }> {
  const { ctx, principal, importType, conflictMode, trustedProvenance, norm } = input
  const { institutionId } = ctx
  const provFields = trustedProvenance
    ? {
        verificationStatus: 'VERIFIED' as const,
        verifiedByUserId: principal.userId,
        verifiedAt: new Date(),
      }
    : {
        verificationStatus: 'PENDING' as const,
      }

  const handleVerifiableUpdate = async (
    modelName: string,
    existing: { id: string; verificationStatus: string; version: number } | null,
    createFn: () => Promise<string>,
    updateFn: (id: string, version: number) => Promise<number>,
  ): Promise<{ outcome: 'CREATED' | 'UPDATED' | 'SKIPPED'; targetModel: string; targetRecordId: string }> => {
    if (!existing) {
      const id = await createFn()
      if (trustedProvenance) {
        await prisma.verificationAuditLog.create({
          data: {
            institutionId,
            itemType: modelName,
            itemId: id,
            action: 'BULK_IMPORT_VERIFIED',
            actorUserId: principal.userId,
            comment: 'Established trusted institutional provenance via bulk import',
          },
        })
      }
      return { outcome: 'CREATED', targetModel: modelName, targetRecordId: id }
    }

    if (conflictMode === 'SKIP_EXISTING') {
      return { outcome: 'SKIPPED', targetModel: modelName, targetRecordId: existing.id }
    }
    if (conflictMode === 'CREATE_ONLY') {
      throw new Error('Record already exists (CREATE_ONLY mode).')
    }
    if (existing.verificationStatus === 'VERIFIED') {
      throw new Error('Skipped/protected: existing VERIFIED record cannot be silently overwritten.')
    }

    const updatedCount = await updateFn(existing.id, existing.version)
    if (updatedCount === 0) {
      throw new Error('Optimistic concurrency conflict: record was modified during import.')
    }
    await prisma.verificationAuditLog.create({
      data: {
        institutionId,
        itemType: modelName,
        itemId: existing.id,
        action: 'BULK_IMPORT_UPDATE',
        actorUserId: principal.userId,
        comment: 'Updated via bulk import',
      },
    })
    return { outcome: 'UPDATED', targetModel: modelName, targetRecordId: existing.id }
  }

  switch (importType) {
    case 'STUDENT_IDENTITY': {
      const enrollmentNumber = String(norm.enrollmentNumber)
      const email = String(norm.email).toLowerCase()
      const dept = ctx.deptByCode.get(String(norm.departmentCode))!
      assertDepartmentAccess(ctx.allowedDepts, dept.id)
      const course = norm.courseCode ? ctx.courseByCode.get(String(norm.courseCode)) : null
      if (course && course.departmentId !== dept.id) {
        throw new Error(`Course "${norm.courseCode}" does not belong to department "${norm.departmentCode}".`)
      }

      const existing =
        ctx.studentByEnrollment.get(enrollmentNumber) ??
        ctx.studentByEmail.get(email)

      if (existing) {
        assertDepartmentAccess(ctx.allowedDepts, existing.departmentId)
        if (conflictMode === 'SKIP_EXISTING') {
          return { outcome: 'SKIPPED', targetModel: 'StudentProfile', targetRecordId: existing.id }
        }
        if (conflictMode === 'CREATE_ONLY') {
          throw new Error(`Student "${enrollmentNumber}" already exists.`)
        }
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { institutionId_id: { institutionId, id: existing.userId } },
            data: {
              firstName: String(norm.firstName),
              lastName: String(norm.lastName),
            },
          })
          await tx.studentProfile.update({
            where: { institutionId_id: { institutionId, id: existing.id } },
            data: {
              enrollmentNumber,
              departmentId: dept.id,
              courseId: course?.id ?? undefined,
              admissionYear: (norm.admissionYear as number | null) ?? undefined,
              currentSemester: (norm.currentSemester as number | null) ?? undefined,
              batchLabel: (norm.batchLabel as string | null) ?? undefined,
              academicStatus: norm.academicStatus as 'ACTIVE' | 'ON_LEAVE' | 'GRADUATED' | 'SUSPENDED' | 'ALUMNI',
              phone: (norm.phone as string | null) ?? undefined,
              dateOfBirth: norm.dateOfBirth ? new Date(String(norm.dateOfBirth)) : undefined,
            },
          })
        })
        return { outcome: 'UPDATED', targetModel: 'StudentProfile', targetRecordId: existing.id }
      }

      const studentRoleId = ctx.roleIdByKey.get('STUDENT')
      if (!studentRoleId) throw new Error('STUDENT role is not configured for this institution.')
      const tempPwd = generateTemporaryPassword(14)
      const passwordHash = await hash(tempPwd, 10)

      const createdProfile = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            institutionId,
            email,
            firstName: String(norm.firstName),
            lastName: String(norm.lastName),
            roleId: studentRoleId,
            passwordHash,
            mustChangePassword: true,
            isActive: true,
          },
        })
        return tx.studentProfile.create({
          data: {
            institutionId,
            userId: user.id,
            enrollmentNumber,
            departmentId: dept.id,
            courseId: course?.id ?? null,
            admissionYear: (norm.admissionYear as number | null) ?? null,
            currentSemester: (norm.currentSemester as number | null) ?? null,
            batchLabel: (norm.batchLabel as string | null) ?? null,
            academicStatus: norm.academicStatus as 'ACTIVE' | 'ON_LEAVE' | 'GRADUATED' | 'SUSPENDED' | 'ALUMNI',
            phone: (norm.phone as string | null) ?? null,
            dateOfBirth: norm.dateOfBirth ? new Date(String(norm.dateOfBirth)) : null,
          },
        })
      })
      ctx.studentByEnrollment.set(enrollmentNumber, {
        id: createdProfile.id,
        userId: createdProfile.userId,
        departmentId: createdProfile.departmentId,
        enrollmentNumber,
      })
      return { outcome: 'CREATED', targetModel: 'StudentProfile', targetRecordId: createdProfile.id }
    }

    case 'FACULTY_IDENTITY': {
      const employeeId = String(norm.employeeId)
      const email = String(norm.email).toLowerCase()
      const dept = ctx.deptByCode.get(String(norm.departmentCode))!
      assertDepartmentAccess(ctx.allowedDepts, dept.id)

      const existing =
        ctx.facultyByEmployeeId.get(employeeId) ??
        ctx.facultyByEmail.get(email)

      if (existing) {
        if (conflictMode === 'SKIP_EXISTING') {
          return { outcome: 'SKIPPED', targetModel: 'FacultyProfile', targetRecordId: existing.id }
        }
        if (conflictMode === 'CREATE_ONLY') {
          throw new Error(`Faculty "${employeeId}" already exists.`)
        }
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { institutionId_id: { institutionId, id: existing.userId } },
            data: {
              firstName: String(norm.firstName),
              lastName: String(norm.lastName),
            },
          })
          await tx.facultyProfile.update({
            where: { institutionId_id: { institutionId, id: existing.id } },
            data: {
              employeeId,
              departmentId: dept.id,
              designation: (norm.designation as string | null) ?? undefined,
              employmentStatus: norm.employmentStatus as 'ACTIVE' | 'ON_LEAVE' | 'VISITING' | 'INACTIVE',
              employmentType: (norm.employmentType as string | null) ?? undefined,
              joiningDate: norm.joiningDate ? new Date(String(norm.joiningDate)) : undefined,
              specialization: (norm.specialization as string | null) ?? undefined,
              orcidId: (norm.orcidId as string | null) ?? undefined,
              scopusAuthorId: (norm.scopusAuthorId as string | null) ?? undefined,
            },
          })
        })
        return { outcome: 'UPDATED', targetModel: 'FacultyProfile', targetRecordId: existing.id }
      }

      const facultyRoleId = ctx.roleIdByKey.get('FACULTY')
      if (!facultyRoleId) throw new Error('FACULTY role is not configured for this institution.')
      const tempPwd = generateTemporaryPassword(14)
      const passwordHash = await hash(tempPwd, 10)

      const createdProfile = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            institutionId,
            email,
            firstName: String(norm.firstName),
            lastName: String(norm.lastName),
            roleId: facultyRoleId,
            passwordHash,
            mustChangePassword: true,
            isActive: true,
          },
        })
        return tx.facultyProfile.create({
          data: {
            institutionId,
            userId: user.id,
            employeeId,
            departmentId: dept.id,
            designation: (norm.designation as string | null) ?? null,
            employmentStatus: norm.employmentStatus as 'ACTIVE' | 'ON_LEAVE' | 'VISITING' | 'INACTIVE',
            employmentType: (norm.employmentType as string | null) ?? null,
            joiningDate: norm.joiningDate ? new Date(String(norm.joiningDate)) : null,
            specialization: (norm.specialization as string | null) ?? null,
            orcidId: (norm.orcidId as string | null) ?? null,
            scopusAuthorId: (norm.scopusAuthorId as string | null) ?? null,
          },
        })
      })
      ctx.facultyByEmployeeId.set(employeeId, {
        id: createdProfile.id,
        userId: createdProfile.userId,
        departmentId: createdProfile.departmentId,
        employeeId,
      })
      return { outcome: 'CREATED', targetModel: 'FacultyProfile', targetRecordId: createdProfile.id }
    }

    case 'STUDENT_EDUCATION': {
      const student = resolveStudentOrThrow(ctx, String(norm.enrollmentNumber))
      const existing = await prisma.studentEducation.findFirst({
        where: {
          institutionId,
          studentProfileId: student.id,
          level: norm.level as 'TENTH' | 'TWELFTH' | 'DEGREE' | 'OTHER',
          institutionName: String(norm.institutionName),
          endYear: (norm.endYear as number | null) ?? null,
        },
        select: { id: true },
      })
      if (existing) {
        if (conflictMode === 'SKIP_EXISTING') return { outcome: 'SKIPPED', targetModel: 'StudentEducation', targetRecordId: existing.id }
        if (conflictMode === 'CREATE_ONLY') throw new Error('Student education record already exists.')
        await prisma.studentEducation.update({
          where: { institutionId_id: { institutionId, id: existing.id } },
          data: {
            boardOrUniversity: (norm.boardOrUniversity as string | null) ?? null,
            courseOrStream: (norm.courseOrStream as string | null) ?? null,
            score: (norm.score as string | null) ?? null,
            startYear: (norm.startYear as number | null) ?? null,
          },
        })
        return { outcome: 'UPDATED', targetModel: 'StudentEducation', targetRecordId: existing.id }
      }
      const created = await prisma.studentEducation.create({
        data: {
          institutionId,
          studentProfileId: student.id,
          level: norm.level as 'TENTH' | 'TWELFTH' | 'DEGREE' | 'OTHER',
          institutionName: String(norm.institutionName),
          boardOrUniversity: (norm.boardOrUniversity as string | null) ?? null,
          courseOrStream: (norm.courseOrStream as string | null) ?? null,
          score: (norm.score as string | null) ?? null,
          startYear: (norm.startYear as number | null) ?? null,
          endYear: (norm.endYear as number | null) ?? null,
        },
      })
      return { outcome: 'CREATED', targetModel: 'StudentEducation', targetRecordId: created.id }
    }

    case 'SEMESTER_RECORD': {
      const student = resolveStudentOrThrow(ctx, String(norm.enrollmentNumber))
      const semesterNumber = Number(norm.semesterNumber)
      const existing = await prisma.studentSemesterRecord.findUnique({
        where: {
          institutionId_studentProfileId_semesterNumber: {
            institutionId,
            studentProfileId: student.id,
            semesterNumber,
          },
        },
        select: { id: true },
      })
      if (existing) {
        if (conflictMode === 'SKIP_EXISTING') return { outcome: 'SKIPPED', targetModel: 'StudentSemesterRecord', targetRecordId: existing.id }
        if (conflictMode === 'CREATE_ONLY') throw new Error(`Semester ${semesterNumber} record already exists.`)
        await prisma.studentSemesterRecord.update({
          where: { institutionId_id: { institutionId, id: existing.id } },
          data: {
            sgpa: Number(norm.sgpa),
            cgpaAtSemester: Number(norm.cgpaAtSemester),
            backlogCount: Number(norm.backlogCount ?? 0),
          },
        })
        return { outcome: 'UPDATED', targetModel: 'StudentSemesterRecord', targetRecordId: existing.id }
      }
      const created = await prisma.studentSemesterRecord.create({
        data: {
          institutionId,
          studentProfileId: student.id,
          semesterNumber,
          sgpa: Number(norm.sgpa),
          cgpaAtSemester: Number(norm.cgpaAtSemester),
          backlogCount: Number(norm.backlogCount ?? 0),
        },
      })
      return { outcome: 'CREATED', targetModel: 'StudentSemesterRecord', targetRecordId: created.id }
    }

    case 'ACHIEVEMENT': {
      const student = resolveStudentOrThrow(ctx, String(norm.enrollmentNumber))
      const awardedAt = norm.awardedAt ? new Date(String(norm.awardedAt)) : null
      const existing = await prisma.achievement.findFirst({
        where: {
          institutionId,
          studentProfileId: student.id,
          title: String(norm.title),
          category: norm.category as 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL',
          awardedAt,
        },
        select: { id: true, verificationStatus: true, version: true },
      })
      return handleVerifiableUpdate(
        'ACHIEVEMENT',
        existing,
        async () => {
          const created = await prisma.achievement.create({
            data: {
              institutionId,
              studentProfileId: student.id,
              title: String(norm.title),
              category: norm.category as 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL',
              status: norm.status as 'PARTICIPATION' | 'WINNER',
              categoryCode: (norm.categoryCode as string | null) ?? null,
              participationLevel: (norm.participationLevel as string | null) ?? null,
              organizer: (norm.organizer as string | null) ?? null,
              role: (norm.role as string | null) ?? null,
              result: (norm.result as string | null) ?? null,
              awardedAt,
              description: (norm.description as string | null) ?? null,
              ...provFields,
            },
          })
          return created.id
        },
        async (id, version) => {
          const res = await prisma.achievement.updateMany({
            where: { institutionId, id, version },
            data: {
              status: norm.status as 'PARTICIPATION' | 'WINNER',
              categoryCode: (norm.categoryCode as string | null) ?? null,
              participationLevel: (norm.participationLevel as string | null) ?? null,
              organizer: (norm.organizer as string | null) ?? null,
              role: (norm.role as string | null) ?? null,
              result: (norm.result as string | null) ?? null,
              description: (norm.description as string | null) ?? null,
              version: { increment: 1 },
            },
          })
          return res.count
        },
      )
    }

    case 'CERTIFICATION': {
      const student = resolveStudentOrThrow(ctx, String(norm.enrollmentNumber))
      const existing = await prisma.studentCertification.findFirst({
        where: {
          institutionId,
          studentProfileId: student.id,
          ...(norm.credentialId ? { credentialId: String(norm.credentialId) } : { name: String(norm.name), issuer: (norm.issuer as string | null) ?? null }),
        },
        select: { id: true, verificationStatus: true, version: true },
      })
      return handleVerifiableUpdate(
        'CERTIFICATION',
        existing,
        async () => {
          const created = await prisma.studentCertification.create({
            data: {
              institutionId,
              studentProfileId: student.id,
              name: String(norm.name),
              issuer: (norm.issuer as string | null) ?? null,
              credentialId: (norm.credentialId as string | null) ?? null,
              credentialUrl: (norm.credentialUrl as string | null) ?? null,
              duration: (norm.duration as string | null) ?? null,
              issuedAt: norm.issuedAt ? new Date(String(norm.issuedAt)) : null,
              expiresAt: norm.expiresAt ? new Date(String(norm.expiresAt)) : null,
              skillsEarned: Array.isArray(norm.skillsEarned) ? (norm.skillsEarned as string[]) : [],
              ...provFields,
            },
          })
          return created.id
        },
        async (id, version) => {
          const res = await prisma.studentCertification.updateMany({
            where: { institutionId, id, version },
            data: {
              name: String(norm.name),
              issuer: (norm.issuer as string | null) ?? null,
              credentialUrl: (norm.credentialUrl as string | null) ?? null,
              duration: (norm.duration as string | null) ?? null,
              issuedAt: norm.issuedAt ? new Date(String(norm.issuedAt)) : null,
              expiresAt: norm.expiresAt ? new Date(String(norm.expiresAt)) : null,
              skillsEarned: Array.isArray(norm.skillsEarned) ? (norm.skillsEarned as string[]) : [],
              version: { increment: 1 },
            },
          })
          return res.count
        },
      )
    }

    case 'PROJECT_INTERNSHIP': {
      const student = resolveStudentOrThrow(ctx, String(norm.enrollmentNumber))
      const startDate = norm.startDate ? new Date(String(norm.startDate)) : null
      const endDate = norm.endDate ? new Date(String(norm.endDate)) : null
      if (norm.recordType === 'PROJECT') {
        const existing = await prisma.studentProject.findFirst({
          where: { institutionId, studentProfileId: student.id, title: String(norm.titleOrOrganization), startDate },
          select: { id: true },
        })
        if (existing) {
          if (conflictMode === 'SKIP_EXISTING') return { outcome: 'SKIPPED', targetModel: 'StudentProject', targetRecordId: existing.id }
          if (conflictMode === 'CREATE_ONLY') throw new Error('Project already exists.')
          await prisma.studentProject.update({
            where: { institutionId_id: { institutionId, id: existing.id } },
            data: {
              facultyGuide: (norm.facultyGuide as string | null) ?? null,
              techStack: Array.isArray(norm.techStack) ? (norm.techStack as string[]) : [],
              outcomes: (norm.outcomes as string | null) ?? null,
              repositoryUrl: (norm.repositoryUrl as string | null) ?? null,
              endDate,
            },
          })
          return { outcome: 'UPDATED', targetModel: 'StudentProject', targetRecordId: existing.id }
        }
        const created = await prisma.studentProject.create({
          data: {
            institutionId,
            studentProfileId: student.id,
            title: String(norm.titleOrOrganization),
            facultyGuide: (norm.facultyGuide as string | null) ?? null,
            techStack: Array.isArray(norm.techStack) ? (norm.techStack as string[]) : [],
            outcomes: (norm.outcomes as string | null) ?? null,
            repositoryUrl: (norm.repositoryUrl as string | null) ?? null,
            startDate,
            endDate,
          },
        })
        return { outcome: 'CREATED', targetModel: 'StudentProject', targetRecordId: created.id }
      }

      const existing = await prisma.studentInternship.findFirst({
        where: { institutionId, studentProfileId: student.id, organization: String(norm.titleOrOrganization), startDate },
        select: { id: true, verificationStatus: true, version: true },
      })
      return handleVerifiableUpdate(
        'INTERNSHIP',
        existing,
        async () => {
          const created = await prisma.studentInternship.create({
            data: {
              institutionId,
              studentProfileId: student.id,
              organization: String(norm.titleOrOrganization),
              role: (norm.role as string | null) ?? null,
              facultyGuide: (norm.facultyGuide as string | null) ?? null,
              techStack: Array.isArray(norm.techStack) ? (norm.techStack as string[]) : [],
              outcomes: (norm.outcomes as string | null) ?? null,
              startDate,
              endDate,
              stipendAmount: (norm.stipendAmount as string | null) ?? null,
              offerType: norm.offerType as 'NONE' | 'PPO_OFFERED' | 'CONVERTED_TO_JOB',
              ...provFields,
            },
          })
          return created.id
        },
        async (id, version) => {
          const res = await prisma.studentInternship.updateMany({
            where: { institutionId, id, version },
            data: {
              role: (norm.role as string | null) ?? null,
              facultyGuide: (norm.facultyGuide as string | null) ?? null,
              techStack: Array.isArray(norm.techStack) ? (norm.techStack as string[]) : [],
              outcomes: (norm.outcomes as string | null) ?? null,
              endDate,
              stipendAmount: (norm.stipendAmount as string | null) ?? null,
              offerType: norm.offerType as 'NONE' | 'PPO_OFFERED' | 'CONVERTED_TO_JOB',
              version: { increment: 1 },
            },
          })
          return res.count
        },
      )
    }

    case 'PLACEMENT_OUTCOME': {
      const student = resolveStudentOrThrow(ctx, String(norm.enrollmentNumber))
      const offeredAt = norm.offeredAt ? new Date(String(norm.offeredAt)) : null
      if (norm.recordType === 'GRADUATE_OUTCOME') {
        const existing = await prisma.studentGraduateOutcome.findUnique({
          where: { institutionId_studentProfileId: { institutionId, studentProfileId: student.id } },
          select: { id: true, verificationStatus: true, version: true },
        })
        return handleVerifiableUpdate(
          'GRADUATE_OUTCOME',
          existing,
          async () => {
            const created = await prisma.studentGraduateOutcome.create({
              data: {
                institutionId,
                studentProfileId: student.id,
                outcomeType: norm.outcomeType as 'PLACED' | 'HIGHER_STUDIES' | 'ENTREPRENEURSHIP' | 'ALUMNI' | 'SEEKING' | 'OTHER',
                organizationOrUniversity: String(norm.companyOrInstitution),
                programOrRole: String(norm.roleOrProgram),
                location: (norm.location as string | null) ?? null,
                recordedAt: offeredAt ?? new Date(),
                ...provFields,
              },
            })
            return created.id
          },
          async (id, version) => {
            const res = await prisma.studentGraduateOutcome.updateMany({
              where: { institutionId, id, version },
              data: {
                outcomeType: norm.outcomeType as 'PLACED' | 'HIGHER_STUDIES' | 'ENTREPRENEURSHIP' | 'ALUMNI' | 'SEEKING' | 'OTHER',
                organizationOrUniversity: String(norm.companyOrInstitution),
                programOrRole: String(norm.roleOrProgram),
                location: (norm.location as string | null) ?? null,
                version: { increment: 1 },
              },
            })
            return res.count
          },
        )
      }

      const existing = await prisma.studentPlacementOffer.findFirst({
        where: {
          institutionId,
          studentProfileId: student.id,
          companyName: String(norm.companyOrInstitution),
          role: String(norm.roleOrProgram),
        },
        select: { id: true, verificationStatus: true, version: true },
      })
      return handleVerifiableUpdate(
        'PLACEMENT_OFFER',
        existing,
        async () => {
          const created = await prisma.studentPlacementOffer.create({
            data: {
              institutionId,
              studentProfileId: student.id,
              companyName: String(norm.companyOrInstitution),
              role: String(norm.roleOrProgram),
              packageCtc: (norm.packageCtc as string | null) ?? null,
              status: norm.offerStatus as 'OFFERED' | 'ACCEPTED' | 'DECLINED',
              offeredAt,
              ...provFields,
            },
          })
          return created.id
        },
        async (id, version) => {
          const res = await prisma.studentPlacementOffer.updateMany({
            where: { institutionId, id, version },
            data: {
              packageCtc: (norm.packageCtc as string | null) ?? null,
              status: norm.offerStatus as 'OFFERED' | 'ACCEPTED' | 'DECLINED',
              offeredAt,
              version: { increment: 1 },
            },
          })
          return res.count
        },
      )
    }

    case 'FACULTY_QUALIFICATION': {
      const faculty = resolveFacultyOrThrow(ctx, String(norm.employeeId))
      const existing = await prisma.facultyEducation.findFirst({
        where: {
          institutionId,
          facultyProfileId: faculty.id,
          qualification: String(norm.qualification),
          institutionName: String(norm.institutionName),
          yearCompleted: (norm.yearCompleted as number | null) ?? null,
        },
        select: { id: true },
      })
      if (existing) {
        if (conflictMode === 'SKIP_EXISTING') return { outcome: 'SKIPPED', targetModel: 'FacultyEducation', targetRecordId: existing.id }
        if (conflictMode === 'CREATE_ONLY') throw new Error('Faculty qualification already exists.')
        await prisma.facultyEducation.update({
          where: { institutionId_id: { institutionId, id: existing.id } },
          data: { fieldOfStudy: (norm.fieldOfStudy as string | null) ?? null },
        })
        return { outcome: 'UPDATED', targetModel: 'FacultyEducation', targetRecordId: existing.id }
      }
      const created = await prisma.facultyEducation.create({
        data: {
          institutionId,
          facultyProfileId: faculty.id,
          qualification: String(norm.qualification),
          institutionName: String(norm.institutionName),
          fieldOfStudy: (norm.fieldOfStudy as string | null) ?? null,
          yearCompleted: (norm.yearCompleted as number | null) ?? null,
        },
      })
      return { outcome: 'CREATED', targetModel: 'FacultyEducation', targetRecordId: created.id }
    }

    case 'FACULTY_EXPERIENCE': {
      const faculty = resolveFacultyOrThrow(ctx, String(norm.employeeId))
      const startDate = norm.startDate ? new Date(String(norm.startDate)) : null
      const endDate = norm.endDate ? new Date(String(norm.endDate)) : null
      const existing = await prisma.facultyExperience.findFirst({
        where: {
          institutionId,
          facultyProfileId: faculty.id,
          type: norm.type as 'TEACHING' | 'INDUSTRY',
          organization: String(norm.organization),
          title: String(norm.title),
          startDate,
        },
        select: { id: true },
      })
      if (existing) {
        if (conflictMode === 'SKIP_EXISTING') return { outcome: 'SKIPPED', targetModel: 'FacultyExperience', targetRecordId: existing.id }
        if (conflictMode === 'CREATE_ONLY') throw new Error('Faculty experience already exists.')
        await prisma.facultyExperience.update({
          where: { institutionId_id: { institutionId, id: existing.id } },
          data: { endDate, description: (norm.description as string | null) ?? null },
        })
        return { outcome: 'UPDATED', targetModel: 'FacultyExperience', targetRecordId: existing.id }
      }
      const created = await prisma.facultyExperience.create({
        data: {
          institutionId,
          facultyProfileId: faculty.id,
          type: norm.type as 'TEACHING' | 'INDUSTRY',
          organization: String(norm.organization),
          title: String(norm.title),
          startDate,
          endDate,
          description: (norm.description as string | null) ?? null,
        },
      })
      return { outcome: 'CREATED', targetModel: 'FacultyExperience', targetRecordId: created.id }
    }

    case 'FACULTY_FDP': {
      const faculty = resolveFacultyOrThrow(ctx, String(norm.employeeId))
      const startDate = new Date(String(norm.startDate))
      const endDate = new Date(String(norm.endDate))
      const existing = await prisma.facultyDevelopmentProgram.findFirst({
        where: {
          institutionId,
          facultyProfileId: faculty.id,
          title: String(norm.title),
          organizer: String(norm.organizer),
          startDate,
        },
        select: { id: true, verificationStatus: true, version: true },
      })
      return handleVerifiableUpdate(
        'FACULTY_FDP',
        existing,
        async () => {
          const created = await prisma.facultyDevelopmentProgram.create({
            data: {
              institutionId,
              facultyProfileId: faculty.id,
              programType: String(norm.programType),
              title: String(norm.title),
              organizer: String(norm.organizer),
              mode: String(norm.mode),
              durationDays: (norm.durationDays as number | null) ?? null,
              startDate,
              endDate,
              ...provFields,
            },
          })
          return created.id
        },
        async (id, version) => {
          const res = await prisma.facultyDevelopmentProgram.updateMany({
            where: { institutionId, id, version },
            data: {
              programType: String(norm.programType),
              mode: String(norm.mode),
              durationDays: (norm.durationDays as number | null) ?? null,
              endDate,
              version: { increment: 1 },
            },
          })
          return res.count
        },
      )
    }

    case 'RESEARCH_PUBLICATION': {
      const faculty = resolveFacultyOrThrow(ctx, String(norm.employeeId))
      const doi = (norm.doi as string | null) ?? null
      const publishedAt = norm.publishedAt ? new Date(String(norm.publishedAt)) : null
      const existingPub = doi
        ? await prisma.canonicalPublication.findUnique({
            where: { institutionId_doi: { institutionId, doi } },
            select: { id: true, verificationStatus: true, version: true },
          })
        : await prisma.canonicalPublication.findFirst({
            where: { institutionId, title: String(norm.title), publishedAt },
            select: { id: true, verificationStatus: true, version: true },
          })

      if (!existingPub) {
        const created = await prisma.$transaction(async (tx) => {
          const pub = await tx.canonicalPublication.create({
            data: {
              institutionId,
              title: String(norm.title),
              publicationType: String(norm.publicationType),
              journalOrConference: (norm.journalOrConference as string | null) ?? null,
              publisher: (norm.publisher as string | null) ?? null,
              doi,
              issnOrIsbn: (norm.issnOrIsbn as string | null) ?? null,
              indexing: (norm.indexing as string | null) ?? null,
              authorsText: (norm.authorsText as string | null) ?? null,
              publishedAt,
              createdByUserId: principal.userId,
              ...provFields,
            },
          })
          await tx.publicationContributor.create({
            data: {
              institutionId,
              canonicalPublicationId: pub.id,
              facultyProfileId: faculty.id,
              authorOrder: Number(norm.authorOrder ?? 1),
            },
          })
          return pub
        })
        return { outcome: 'CREATED', targetModel: 'CANONICAL_PUBLICATION', targetRecordId: created.id }
      }

      // Link contributor if not already linked
      const existingContrib = await prisma.publicationContributor.findUnique({
        where: {
          institutionId_canonicalPublicationId_facultyProfileId: {
            institutionId,
            canonicalPublicationId: existingPub.id,
            facultyProfileId: faculty.id,
          },
        },
      })
      if (!existingContrib) {
        await prisma.publicationContributor.create({
          data: {
            institutionId,
            canonicalPublicationId: existingPub.id,
            facultyProfileId: faculty.id,
            authorOrder: Number(norm.authorOrder ?? 1),
          },
        })
        return { outcome: 'UPDATED', targetModel: 'CANONICAL_PUBLICATION', targetRecordId: existingPub.id }
      }

      if (conflictMode === 'SKIP_EXISTING') {
        return { outcome: 'SKIPPED', targetModel: 'CANONICAL_PUBLICATION', targetRecordId: existingPub.id }
      }
      if (conflictMode === 'CREATE_ONLY') {
        throw new Error('Publication and contributor already exist.')
      }
      if (existingPub.verificationStatus === 'VERIFIED') {
        throw new Error('Skipped/protected: existing VERIFIED publication cannot be silently overwritten.')
      }
      const res = await prisma.canonicalPublication.updateMany({
        where: { institutionId, id: existingPub.id, version: existingPub.version },
        data: {
          journalOrConference: (norm.journalOrConference as string | null) ?? null,
          publisher: (norm.publisher as string | null) ?? null,
          indexing: (norm.indexing as string | null) ?? null,
          version: { increment: 1 },
        },
      })
      if (res.count === 0) throw new Error('Concurrency conflict updating publication.')
      return { outcome: 'UPDATED', targetModel: 'CANONICAL_PUBLICATION', targetRecordId: existingPub.id }
    }

    case 'PATENT': {
      const patentNumber = (norm.patentNumber as string | null) ?? null
      const filedAt = norm.filedAt ? new Date(String(norm.filedAt)) : null
      if (norm.ownerType === 'STUDENT') {
        const student = resolveStudentOrThrow(ctx, String(norm.ownerIdentifier))
        const existing = await prisma.studentPatent.findFirst({
          where: {
            institutionId,
            studentProfileId: student.id,
            ...(patentNumber ? { patentNumber } : { title: String(norm.title) }),
          },
          select: { id: true, verificationStatus: true, version: true },
        })
        return handleVerifiableUpdate(
          'PATENT',
          existing,
          async () => {
            const c = await prisma.studentPatent.create({
              data: {
                institutionId,
                studentProfileId: student.id,
                title: String(norm.title),
                patentNumber,
                status: (norm.status as string | null) ?? null,
                filedAt,
                ...provFields,
              },
            })
            return c.id
          },
          async (id, version) => {
            const r = await prisma.studentPatent.updateMany({
              where: { institutionId, id, version },
              data: { title: String(norm.title), status: (norm.status as string | null) ?? null, filedAt, version: { increment: 1 } },
            })
            return r.count
          },
        )
      }

      const faculty = resolveFacultyOrThrow(ctx, String(norm.ownerIdentifier))
      const existing = await prisma.facultyPatent.findFirst({
        where: {
          institutionId,
          facultyProfileId: faculty.id,
          ...(patentNumber ? { patentNumber } : { title: String(norm.title) }),
        },
        select: { id: true, verificationStatus: true, version: true },
      })
      return handleVerifiableUpdate(
        'FACULTY_PATENT',
        existing,
        async () => {
          const c = await prisma.facultyPatent.create({
            data: {
              institutionId,
              facultyProfileId: faculty.id,
              title: String(norm.title),
              patentNumber,
              status: (norm.status as string | null) ?? null,
              filedAt,
              ...provFields,
            },
          })
          return c.id
        },
        async (id, version) => {
          const r = await prisma.facultyPatent.updateMany({
            where: { institutionId, id, version },
            data: { title: String(norm.title), status: (norm.status as string | null) ?? null, filedAt, version: { increment: 1 } },
          })
          return r.count
        },
      )
    }

    case 'CONSULTANCY_CONTRIBUTION': {
      const faculty = resolveFacultyOrThrow(ctx, String(norm.employeeId))
      const startDate = new Date(String(norm.startDate))
      const endDate = norm.endDate ? new Date(String(norm.endDate)) : null
      if (norm.recordType === 'CONSULTANCY') {
        const existing = await prisma.facultyConsultancy.findFirst({
          where: {
            institutionId,
            facultyProfileId: faculty.id,
            title: String(norm.title),
            clientOrganization: String(norm.organization),
            startDate,
          },
          select: { id: true, verificationStatus: true, version: true },
        })
        return handleVerifiableUpdate(
          'FACULTY_CONSULTANCY',
          existing,
          async () => {
            const c = await prisma.facultyConsultancy.create({
              data: {
                institutionId,
                facultyProfileId: faculty.id,
                title: String(norm.title),
                clientOrganization: String(norm.organization),
                role: (norm.role as string | null) ?? null,
                amount: (norm.amount as string | null) ?? null,
                startDate,
                endDate,
                outcomes: (norm.outcomesOrDescription as string | null) ?? null,
                ...provFields,
              },
            })
            return c.id
          },
          async (id, version) => {
            const r = await prisma.facultyConsultancy.updateMany({
              where: { institutionId, id, version },
              data: {
                role: (norm.role as string | null) ?? null,
                amount: (norm.amount as string | null) ?? null,
                endDate,
                outcomes: (norm.outcomesOrDescription as string | null) ?? null,
                version: { increment: 1 },
              },
            })
            return r.count
          },
        )
      }

      const existing = await prisma.facultyContribution.findFirst({
        where: {
          institutionId,
          facultyProfileId: faculty.id,
          contributionType: String(norm.contributionType),
          title: String(norm.title),
          startDate,
        },
        select: { id: true, verificationStatus: true, version: true },
      })
      return handleVerifiableUpdate(
        'FACULTY_CONTRIBUTION',
        existing,
        async () => {
          const c = await prisma.facultyContribution.create({
            data: {
              institutionId,
              facultyProfileId: faculty.id,
              contributionType: String(norm.contributionType),
              title: String(norm.title),
              organizationOrBody: String(norm.organization),
              role: (norm.role as string | null) ?? null,
              startDate,
              endDate,
              description: (norm.outcomesOrDescription as string | null) ?? null,
              ...provFields,
            },
          })
          return c.id
        },
        async (id, version) => {
          const r = await prisma.facultyContribution.updateMany({
            where: { institutionId, id, version },
            data: {
              organizationOrBody: String(norm.organization),
              role: (norm.role as string | null) ?? null,
              endDate,
              description: (norm.outcomesOrDescription as string | null) ?? null,
              version: { increment: 1 },
            },
          })
          return r.count
        },
      )
    }

    case 'TEACHING_WORKLOAD': {
      const faculty = resolveFacultyOrThrow(ctx, String(norm.employeeId))
      const existing = await prisma.facultyTeachingLoad.findFirst({
        where: {
          institutionId,
          facultyProfileId: faculty.id,
          academicYear: String(norm.academicYear),
          semester: Number(norm.semester),
          subjectName: String(norm.subjectName),
        },
        select: { id: true },
      })
      if (existing) {
        if (conflictMode === 'SKIP_EXISTING') return { outcome: 'SKIPPED', targetModel: 'FacultyTeachingLoad', targetRecordId: existing.id }
        if (conflictMode === 'CREATE_ONLY') throw new Error('Teaching load entry already exists.')
        await prisma.facultyTeachingLoad.update({
          where: { institutionId_id: { institutionId, id: existing.id } },
          data: {
            subjectCode: (norm.subjectCode as string | null) ?? null,
            hoursPerWeek: Number(norm.hoursPerWeek),
            studentCount: (norm.studentCount as number | null) ?? null,
          },
        })
        return { outcome: 'UPDATED', targetModel: 'FacultyTeachingLoad', targetRecordId: existing.id }
      }
      const created = await prisma.facultyTeachingLoad.create({
        data: {
          institutionId,
          facultyProfileId: faculty.id,
          academicYear: String(norm.academicYear),
          semester: Number(norm.semester),
          subjectName: String(norm.subjectName),
          subjectCode: (norm.subjectCode as string | null) ?? null,
          hoursPerWeek: Number(norm.hoursPerWeek),
          studentCount: (norm.studentCount as number | null) ?? null,
        },
      })
      return { outcome: 'CREATED', targetModel: 'FacultyTeachingLoad', targetRecordId: created.id }
    }
  }
}

export async function processImportJob(input: {
  institutionId: string
  id: string
  actorPrincipal?: AuthenticatedPrincipal
}) {
  const job = await prisma.importJob.findUnique({
    where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
  })
  if (!job) throw new Error('Import job not found.')
  if (!isImportTypeKey(job.importType)) throw new Error('Unknown import type on job.')

  const principal =
    input.actorPrincipal ?? (await resolvePrincipalForJob(job.institutionId, job.requestedByUserId))
  const importType = job.importType
  const trustedProvenance = job.trustProvenance === 'INSTITUTIONAL_TRUSTED'

  if (job.status === 'QUEUED') {
    await prisma.importJob.update({
      where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
      data: { status: 'PROCESSING', startedAt: new Date() },
    })
  }

  let createdCount = 0
  let updatedCount = 0
  let skippedCount = 0
  let failedCount = job.invalidRows
  let processedRows = job.invalidRows

  try {
    let cursorRowNumber = 0
    while (true) {
      const batch = await prisma.importJobRow.findMany({
        where: {
          institutionId: job.institutionId,
          importJobId: job.id,
          status: 'VALID',
          rowNumber: { gt: cursorRowNumber },
        },
        orderBy: { rowNumber: 'asc' },
        take: BATCH_SIZE,
      })

      if (batch.length === 0) break
      cursorRowNumber = batch[batch.length - 1].rowNumber

      const norms = batch
        .map((r) => r.normalizedJson)
        .filter(
          (n): n is Prisma.JsonObject =>
            Boolean(n && typeof n === 'object' && !Array.isArray(n)),
        ) as Array<Record<string, unknown>>

      const ctx = await buildLookupContext(principal, importType, norms)

      for (const row of batch) {
        processedRows += 1
        try {
          const norm = row.normalizedJson as Record<string, unknown>
          const result = await applySingleImportRow({
            ctx,
            principal,
            importType,
            conflictMode: job.conflictMode,
            trustedProvenance,
            norm,
          })

          await prisma.importJobRow.update({
            where: { institutionId_id: { institutionId: job.institutionId, id: row.id } },
            data: {
              status: result.outcome,
              targetModel: result.targetModel,
              targetRecordId: result.targetRecordId,
              errorMessage: null,
            },
          })

          if (result.outcome === 'CREATED') createdCount += 1
          else if (result.outcome === 'UPDATED') updatedCount += 1
          else skippedCount += 1
        } catch (err) {
          failedCount += 1
          const message = err instanceof Error ? err.message : 'Row execution failed.'
          await prisma.importJobRow.update({
            where: { institutionId_id: { institutionId: job.institutionId, id: row.id } },
            data: {
              status: 'FAILED',
              errorMessage: message,
            },
          })
        }
      }

      await prisma.importJob.update({
        where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
        data: {
          processedRows,
          createdCount,
          updatedCount,
          skippedCount,
          failedCount,
        },
      })
    }

    const finalStatus =
      failedCount === 0
        ? 'COMPLETED'
        : createdCount + updatedCount + skippedCount > 0
          ? 'PARTIALLY_FAILED'
          : 'FAILED'

    invalidateInstitutionOverviewCache(job.institutionId)

    return prisma.importJob.update({
      where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
      data: {
        status: finalStatus,
        processedRows: job.totalRows,
        createdCount,
        updatedCount,
        skippedCount,
        failedCount,
        completedAt: new Date(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import job failed.'
    return prisma.importJob.update({
      where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
      data: {
        status: 'FAILED',
        errorMessage: message,
        completedAt: new Date(),
      },
    })
  }
}

export async function rollbackImportJob(input: {
  principal: AuthenticatedPrincipal
  jobId: string
}) {
  assertCanAccessImportCenter(input.principal)
  const { institutionId } = input.principal
  const job = await prisma.importJob.findUnique({
    where: { institutionId_id: { institutionId, id: input.jobId } },
  })
  if (!job) throw new Error('Import job not found.')
  if (job.status !== 'COMPLETED' && job.status !== 'PARTIALLY_FAILED') {
    throw new Error(`Cannot roll back job in status ${job.status}.`)
  }

  const createdRows = await prisma.importJobRow.findMany({
    where: { institutionId, importJobId: job.id, status: 'CREATED' },
    select: { id: true, targetModel: true, targetRecordId: true },
  })

  let rolledBackCount = 0
  for (const r of createdRows) {
    if (!r.targetModel || !r.targetRecordId) continue
    const id = r.targetRecordId
    switch (r.targetModel) {
      case 'StudentProfile':
        await prisma.studentProfile.deleteMany({ where: { institutionId, id } })
        break
      case 'FacultyProfile':
        await prisma.facultyProfile.deleteMany({ where: { institutionId, id } })
        break
      case 'StudentEducation':
        await prisma.studentEducation.deleteMany({ where: { institutionId, id } })
        break
      case 'StudentSemesterRecord':
        await prisma.studentSemesterRecord.deleteMany({ where: { institutionId, id } })
        break
      case 'ACHIEVEMENT':
        await prisma.achievement.deleteMany({ where: { institutionId, id } })
        break
      case 'CERTIFICATION':
        await prisma.studentCertification.deleteMany({ where: { institutionId, id } })
        break
      case 'StudentProject':
        await prisma.studentProject.deleteMany({ where: { institutionId, id } })
        break
      case 'INTERNSHIP':
        await prisma.studentInternship.deleteMany({ where: { institutionId, id } })
        break
      case 'PLACEMENT_OFFER':
        await prisma.studentPlacementOffer.deleteMany({ where: { institutionId, id } })
        break
      case 'GRADUATE_OUTCOME':
        await prisma.studentGraduateOutcome.deleteMany({ where: { institutionId, id } })
        break
      case 'FacultyEducation':
        await prisma.facultyEducation.deleteMany({ where: { institutionId, id } })
        break
      case 'FacultyExperience':
        await prisma.facultyExperience.deleteMany({ where: { institutionId, id } })
        break
      case 'FACULTY_FDP':
        await prisma.facultyDevelopmentProgram.deleteMany({ where: { institutionId, id } })
        break
      case 'CANONICAL_PUBLICATION':
        await prisma.canonicalPublication.deleteMany({ where: { institutionId, id } })
        break
      case 'PATENT':
        await prisma.studentPatent.deleteMany({ where: { institutionId, id } })
        break
      case 'FACULTY_PATENT':
        await prisma.facultyPatent.deleteMany({ where: { institutionId, id } })
        break
      case 'FACULTY_CONSULTANCY':
        await prisma.facultyConsultancy.deleteMany({ where: { institutionId, id } })
        break
      case 'FACULTY_CONTRIBUTION':
        await prisma.facultyContribution.deleteMany({ where: { institutionId, id } })
        break
      case 'FacultyTeachingLoad':
        await prisma.facultyTeachingLoad.deleteMany({ where: { institutionId, id } })
        break
    }
    rolledBackCount += 1
  }

  await prisma.importJobRow.updateMany({
    where: { institutionId, importJobId: job.id, status: 'CREATED' },
    data: { status: 'ROLLED_BACK' },
  })

  invalidateInstitutionOverviewCache(institutionId)

  const updated = await prisma.importJob.update({
    where: { institutionId_id: { institutionId, id: job.id } },
    data: { status: 'ROLLED_BACK', rolledBackAt: new Date() },
  })
  return { job: updated, rolledBackCount }
}

export async function listImportJobs(principal: AuthenticatedPrincipal, limit = 25) {
  assertCanAccessImportCenter(principal)
  const allowedDepts = await resolveDepartmentScope(principal)
  return prisma.importJob.findMany({
    where: {
      institutionId: principal.institutionId,
      ...(allowedDepts !== null ? { requestedByUserId: principal.userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      importType: true,
      fileName: true,
      fileFormat: true,
      conflictMode: true,
      trustProvenance: true,
      status: true,
      totalRows: true,
      validRows: true,
      invalidRows: true,
      processedRows: true,
      createdCount: true,
      updatedCount: true,
      skippedCount: true,
      failedCount: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
      rolledBackAt: true,
    },
  })
}

export async function getImportJobStatus(principal: AuthenticatedPrincipal, jobId: string) {
  assertCanAccessImportCenter(principal)
  const job = await prisma.importJob.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: jobId } },
  })
  if (!job) throw new Error('Import job not found.')
  return job
}

export async function getImportJobErrorReportCsv(principal: AuthenticatedPrincipal, jobId: string) {
  assertCanAccessImportCenter(principal)
  const job = await prisma.importJob.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: jobId } },
    select: { id: true, fileName: true },
  })
  if (!job) throw new Error('Import job not found.')

  const errorRows = await prisma.importJobRow.findMany({
    where: {
      institutionId: principal.institutionId,
      importJobId: job.id,
      status: { in: ['INVALID', 'FAILED'] },
    },
    orderBy: { rowNumber: 'asc' },
    select: {
      rowNumber: true,
      status: true,
      matchKey: true,
      errorMessage: true,
      rawPayloadJson: true,
    },
  })

  return {
    filename: `import-errors-${job.id}.csv`,
    csv: buildImportErrorReportCsv(errorRows),
    errorCount: errorRows.length,
  }
}
