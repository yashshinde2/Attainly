import 'server-only'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '@/lib/server/authorization'
import { invalidateInstitutionOverviewCache } from '@/lib/server/overview-cache'

export type StudentTransitionType =
  | 'SEMESTER_ADVANCE'
  | 'BATCH_PROMOTION'
  | 'DIVISION_CHANGE'
  | 'DEPARTMENT_TRANSFER'
  | 'LATERAL_ENTRY'
  | 'GRADUATION'
  | 'ALUMNI_TRANSITION'
  | 'DISCONTINUED'
  | 'TRANSFERRED_OUT'

export type FacultyTransitionType =
  | 'DESIGNATION_CHANGE'
  | 'DEPARTMENT_TRANSFER'
  | 'STATUS_CHANGE'
  | 'RELIEVING'
  | 'RETIREMENT'
  | 'ARCHIVED'

export interface StudentTransitionParams {
  transitionType: StudentTransitionType
  studentProfileIds: string[]
  academicYearId?: string | null
  targetDepartmentId?: string | null
  targetCourseId?: string | null
  targetDivision?: string | null
  targetBatchLabel?: string | null
  targetSemester?: number | null
  graduationYear?: number | null
  effectiveDate?: string | null
  reason?: string | null
}

export interface FacultyTransitionParams {
  transitionType: FacultyTransitionType
  facultyProfileIds: string[]
  targetDepartmentId?: string | null
  targetDesignation?: string | null
  targetStatus?: 'ACTIVE' | 'ON_LEAVE' | 'VISITING' | 'INACTIVE' | 'RETIRED' | 'RELIEVED' | 'ARCHIVED'
  effectiveDate?: string | null
  reason?: string | null
}

export interface TransitionPreviewItem {
  profileId: string
  name: string
  identifier: string
  eligibility: 'WILL_APPLY' | 'SKIPPED' | 'INELIGIBLE'
  summary: string
  reason?: string
}

export async function setCurrentAcademicYear(
  principal: AuthenticatedPrincipal,
  academicYearId: string,
) {
  requirePermission(principal, 'institution:manage')
  const { institutionId } = principal
  const ay = await prisma.academicYear.findUnique({
    where: { institutionId_id: { institutionId, id: academicYearId } },
  })
  if (!ay) throw new Error('Academic year not found.')

  await prisma.$transaction([
    prisma.academicYear.updateMany({
      where: { institutionId, isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.academicYear.update({
      where: { institutionId_id: { institutionId, id: academicYearId } },
      data: { isCurrent: true },
    }),
  ])
  invalidateInstitutionOverviewCache(institutionId)
  return { ...ay, isCurrent: true }
}

export async function previewStudentLifecycleTransition(
  principal: AuthenticatedPrincipal,
  params: StudentTransitionParams,
): Promise<TransitionPreviewItem[]> {
  requirePermission(principal, 'user:manage')
  const { institutionId } = principal
  const ids = [...new Set(params.studentProfileIds)].filter(Boolean)
  if (ids.length === 0) return []

  const profiles = await prisma.studentProfile.findMany({
    where: { institutionId, id: { in: ids } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      department: { select: { code: true } },
    },
  })
  const byId = new Map(profiles.map((p) => [p.id, p]))

  const existingAyPromotions =
    params.transitionType === 'SEMESTER_ADVANCE' && params.academicYearId
      ? new Set(
          (
            await prisma.studentLifecycleEvent.findMany({
              where: {
                institutionId,
                studentProfileId: { in: ids },
                eventType: 'SEMESTER_ADVANCE',
                academicYearId: params.academicYearId,
              },
              select: { studentProfileId: true },
            })
          ).map((e) => e.studentProfileId),
        )
      : new Set<string>()

  return ids.map((id) => {
    const p = byId.get(id)
    if (!p) {
      return {
        profileId: id,
        name: 'Unknown',
        identifier: id,
        eligibility: 'INELIGIBLE',
        summary: 'Not found',
        reason: 'Student profile not found in this institution.',
      }
    }
    const name = `${p.user.firstName} ${p.user.lastName}`
    const identifier = p.enrollmentNumber ?? p.id

    switch (params.transitionType) {
      case 'SEMESTER_ADVANCE': {
        if (p.academicStatus !== 'ACTIVE') {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: p.academicStatus, reason: `Student status is ${p.academicStatus}, not ACTIVE.` }
        }
        if (
          params.academicYearId &&
          (p.lastPromotedAcademicYearId === params.academicYearId || existingAyPromotions.has(p.id))
        ) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: `Sem ${p.currentSemester ?? 1}`, reason: 'Already promoted in this academic year (duplicate promotion blocked).' }
        }
        const curSem = p.currentSemester ?? 1
        if (curSem >= 12) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: `Sem ${curSem}`, reason: 'Already at maximum semester (12).' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `Sem ${curSem} -> Sem ${curSem + 1}` }
      }
      case 'BATCH_PROMOTION': {
        if (p.academicStatus !== 'ACTIVE') {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: p.academicStatus, reason: 'Only ACTIVE students can be batch-promoted.' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `Batch ${p.batchLabel ?? '—'} -> ${params.targetBatchLabel ?? 'Unchanged'}` }
      }
      case 'DIVISION_CHANGE': {
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `Div ${p.division ?? '—'} -> ${params.targetDivision ?? '—'}` }
      }
      case 'DEPARTMENT_TRANSFER': {
        if (!params.targetDepartmentId) {
          return { profileId: id, name, identifier, eligibility: 'INELIGIBLE', summary: 'Missing dept', reason: 'Target department is required.' }
        }
        if (p.departmentId === params.targetDepartmentId && (!params.targetCourseId || p.courseId === params.targetCourseId)) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: p.department?.code ?? '—', reason: 'Already in target department & program.' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.department?.code ?? 'Unassigned'} -> Transfer (old records preserved)` }
      }
      case 'LATERAL_ENTRY': {
        const sem = params.targetSemester ?? 3
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `Lateral Entry at Sem ${sem}` }
      }
      case 'GRADUATION': {
        if (p.academicStatus === 'GRADUATED' || p.academicStatus === 'ALUMNI') {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: p.academicStatus, reason: `Already marked ${p.academicStatus}.` }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.academicStatus} -> GRADUATED (${params.graduationYear ?? new Date().getFullYear()})` }
      }
      case 'ALUMNI_TRANSITION': {
        if (p.academicStatus === 'ALUMNI') {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: 'ALUMNI', reason: 'Already transitioned to ALUMNI.' }
        }
        if (p.academicStatus === 'DISCONTINUED' || p.academicStatus === 'TRANSFERRED') {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: p.academicStatus, reason: `Cannot transition ${p.academicStatus} student to ALUMNI.` }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.academicStatus} -> ALUMNI` }
      }
      case 'DISCONTINUED':
      case 'TRANSFERRED_OUT': {
        const target = params.transitionType === 'DISCONTINUED' ? 'DISCONTINUED' : 'TRANSFERRED'
        if (p.academicStatus === target) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: target, reason: `Already ${target}.` }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.academicStatus} -> ${target}` }
      }
    }
  })
}

export async function executeStudentLifecycleTransition(
  principal: AuthenticatedPrincipal,
  params: StudentTransitionParams,
) {
  requirePermission(principal, 'user:manage')
  const { institutionId } = principal
  const preview = await previewStudentLifecycleTransition(principal, params)
  const effectiveDate = params.effectiveDate ? new Date(params.effectiveDate) : new Date()

  if (params.transitionType === 'DEPARTMENT_TRANSFER' && params.targetDepartmentId) {
    const dept = await prisma.department.findUnique({
      where: { institutionId_id: { institutionId, id: params.targetDepartmentId } },
    })
    if (!dept) throw new Error('Target department not found.')
    if (params.targetCourseId) {
      const course = await prisma.course.findUnique({
        where: { institutionId_id: { institutionId, id: params.targetCourseId } },
      })
      if (!course || course.departmentId !== dept.id) {
        throw new Error('Selected course does not belong to the target department.')
      }
    }
  }

  let succeededCount = 0
  let skippedCount = 0
  let failedCount = 0

  const batch = await prisma.lifecycleTransitionBatch.create({
    data: {
      institutionId,
      targetScope: 'STUDENT',
      transitionType: params.transitionType,
      academicYearId: params.academicYearId ?? null,
      actorUserId: principal.userId,
      reason: params.reason ?? null,
      totalSelected: preview.length,
    },
  })

  const results: Array<TransitionPreviewItem & { outcome: 'SUCCEEDED' | 'SKIPPED' | 'FAILED' }> = []

  for (const item of preview) {
    if (item.eligibility === 'SKIPPED') {
      skippedCount += 1
      results.push({ ...item, outcome: 'SKIPPED' })
      continue
    }
    if (item.eligibility === 'INELIGIBLE') {
      failedCount += 1
      results.push({ ...item, outcome: 'FAILED' })
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.studentProfile.findUnique({
          where: { institutionId_id: { institutionId, id: item.profileId } },
        })
        if (!current) throw new Error('Student profile disappeared.')

        if (params.transitionType === 'DEPARTMENT_TRANSFER' && current.departmentId) {
          // Stamp existing unattributed historical records with the pre-transfer department & course
          await Promise.all([
            tx.achievement.updateMany({
              where: { institutionId, studentProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId, courseId: current.courseId },
            }),
            tx.studentCertification.updateMany({
              where: { institutionId, studentProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId, courseId: current.courseId },
            }),
            tx.studentInternship.updateMany({
              where: { institutionId, studentProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId, courseId: current.courseId },
            }),
            tx.studentPlacementOffer.updateMany({
              where: { institutionId, studentProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId, courseId: current.courseId },
            }),
          ])
        }

        const updateData: Record<string, unknown> = {}
        const eventBase = {
          institutionId,
          studentProfileId: current.id,
          batchId: batch.id,
          eventType: params.transitionType,
          academicYearId: params.academicYearId ?? null,
          fromDepartmentId: current.departmentId,
          toDepartmentId: current.departmentId,
          fromCourseId: current.courseId,
          toCourseId: current.courseId,
          fromSemester: current.currentSemester,
          toSemester: current.currentSemester,
          fromDivision: current.division,
          toDivision: current.division,
          fromBatchLabel: current.batchLabel,
          toBatchLabel: current.batchLabel,
          fromStatus: current.academicStatus,
          toStatus: current.academicStatus,
          effectiveDate,
          actorUserId: principal.userId,
          notes: params.reason ?? null,
        }

        switch (params.transitionType) {
          case 'SEMESTER_ADVANCE': {
            const nextSem = (current.currentSemester ?? 1) + 1
            updateData.currentSemester = nextSem
            if (params.academicYearId) updateData.lastPromotedAcademicYearId = params.academicYearId
            eventBase.toSemester = nextSem
            break
          }
          case 'BATCH_PROMOTION': {
            if (params.targetBatchLabel) {
              updateData.batchLabel = params.targetBatchLabel
              eventBase.toBatchLabel = params.targetBatchLabel
            }
            break
          }
          case 'DIVISION_CHANGE': {
            updateData.division = params.targetDivision ?? null
            eventBase.toDivision = params.targetDivision ?? null
            break
          }
          case 'DEPARTMENT_TRANSFER': {
            updateData.departmentId = params.targetDepartmentId
            eventBase.toDepartmentId = params.targetDepartmentId ?? null
            if (params.targetCourseId !== undefined) {
              updateData.courseId = params.targetCourseId
              eventBase.toCourseId = params.targetCourseId
            }
            break
          }
          case 'LATERAL_ENTRY': {
            const sem = params.targetSemester ?? 3
            updateData.isLateralEntry = true
            updateData.currentSemester = sem
            eventBase.toSemester = sem
            if (params.targetBatchLabel) {
              updateData.batchLabel = params.targetBatchLabel
              eventBase.toBatchLabel = params.targetBatchLabel
            }
            break
          }
          case 'GRADUATION': {
            const gradYear = params.graduationYear ?? effectiveDate.getFullYear()
            updateData.academicStatus = 'GRADUATED'
            updateData.graduationYear = gradYear
            eventBase.toStatus = 'GRADUATED'
            break
          }
          case 'ALUMNI_TRANSITION': {
            updateData.academicStatus = 'ALUMNI'
            updateData.alumniSince = effectiveDate
            eventBase.toStatus = 'ALUMNI'
            break
          }
          case 'DISCONTINUED': {
            updateData.academicStatus = 'DISCONTINUED'
            updateData.discontinuedAt = effectiveDate
            eventBase.toStatus = 'DISCONTINUED'
            break
          }
          case 'TRANSFERRED_OUT': {
            updateData.academicStatus = 'TRANSFERRED'
            updateData.discontinuedAt = effectiveDate
            eventBase.toStatus = 'TRANSFERRED'
            break
          }
        }

        await tx.studentProfile.update({
          where: { institutionId_id: { institutionId, id: current.id } },
          data: updateData,
        })
        await tx.studentLifecycleEvent.create({ data: eventBase })
      })

      succeededCount += 1
      results.push({ ...item, outcome: 'SUCCEEDED' })
    } catch (err) {
      failedCount += 1
      results.push({
        ...item,
        outcome: 'FAILED',
        reason: err instanceof Error ? err.message : 'Transition failed.',
      })
    }
  }

  await prisma.lifecycleTransitionBatch.update({
    where: { institutionId_id: { institutionId, id: batch.id } },
    data: { succeededCount, skippedCount, failedCount },
  })

  invalidateInstitutionOverviewCache(institutionId)
  return { batchId: batch.id, totalSelected: preview.length, succeededCount, skippedCount, failedCount, results }
}

export async function previewFacultyLifecycleTransition(
  principal: AuthenticatedPrincipal,
  params: FacultyTransitionParams,
): Promise<TransitionPreviewItem[]> {
  requirePermission(principal, 'user:manage')
  const { institutionId } = principal
  const ids = [...new Set(params.facultyProfileIds)].filter(Boolean)
  if (ids.length === 0) return []

  const profiles = await prisma.facultyProfile.findMany({
    where: { institutionId, id: { in: ids } },
    include: {
      user: { select: { firstName: true, lastName: true } },
      department: { select: { code: true } },
    },
  })
  const byId = new Map(profiles.map((p) => [p.id, p]))

  return ids.map((id) => {
    const p = byId.get(id)
    if (!p) {
      return { profileId: id, name: 'Unknown', identifier: id, eligibility: 'INELIGIBLE', summary: 'Not found', reason: 'Faculty profile not found.' }
    }
    const name = `${p.user.firstName} ${p.user.lastName}`
    const identifier = p.employeeId ?? p.id

    switch (params.transitionType) {
      case 'DESIGNATION_CHANGE': {
        if (!params.targetDesignation?.trim()) {
          return { profileId: id, name, identifier, eligibility: 'INELIGIBLE', summary: 'Missing designation', reason: 'Target designation is required.' }
        }
        if (p.designation === params.targetDesignation.trim()) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: p.designation ?? '—', reason: 'Already holds this designation.' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.designation ?? '—'} -> ${params.targetDesignation.trim()}` }
      }
      case 'DEPARTMENT_TRANSFER': {
        if (!params.targetDepartmentId) {
          return { profileId: id, name, identifier, eligibility: 'INELIGIBLE', summary: 'Missing dept', reason: 'Target department is required.' }
        }
        if (p.departmentId === params.targetDepartmentId) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: p.department?.code ?? '—', reason: 'Already in target department.' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.department?.code ?? 'Unassigned'} -> Transfer (old records preserved)` }
      }
      case 'STATUS_CHANGE': {
        const nextStatus = params.targetStatus ?? 'ACTIVE'
        if (p.employmentStatus === nextStatus) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: nextStatus, reason: `Already ${nextStatus}.` }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.employmentStatus} -> ${nextStatus}` }
      }
      case 'RELIEVING': {
        if (p.employmentStatus === 'RELIEVED') {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: 'RELIEVED', reason: 'Already marked RELIEVED.' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.employmentStatus} -> RELIEVED` }
      }
      case 'RETIREMENT': {
        if (p.employmentStatus === 'RETIRED') {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: 'RETIRED', reason: 'Already marked RETIRED.' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.employmentStatus} -> RETIRED` }
      }
      case 'ARCHIVED': {
        if (p.isArchived) {
          return { profileId: id, name, identifier, eligibility: 'SKIPPED', summary: 'ARCHIVED', reason: 'Portfolio already archived.' }
        }
        return { profileId: id, name, identifier, eligibility: 'WILL_APPLY', summary: `${p.employmentStatus} -> ARCHIVED` }
      }
    }
  })
}

export async function executeFacultyLifecycleTransition(
  principal: AuthenticatedPrincipal,
  params: FacultyTransitionParams,
) {
  requirePermission(principal, 'user:manage')
  const { institutionId } = principal
  const preview = await previewFacultyLifecycleTransition(principal, params)
  const effectiveDate = params.effectiveDate ? new Date(params.effectiveDate) : new Date()

  if (params.transitionType === 'DEPARTMENT_TRANSFER' && params.targetDepartmentId) {
    const dept = await prisma.department.findUnique({
      where: { institutionId_id: { institutionId, id: params.targetDepartmentId } },
    })
    if (!dept) throw new Error('Target department not found.')
  }

  let succeededCount = 0
  let skippedCount = 0
  let failedCount = 0

  const batch = await prisma.lifecycleTransitionBatch.create({
    data: {
      institutionId,
      targetScope: 'FACULTY',
      transitionType: params.transitionType,
      actorUserId: principal.userId,
      reason: params.reason ?? null,
      totalSelected: preview.length,
    },
  })

  const results: Array<TransitionPreviewItem & { outcome: 'SUCCEEDED' | 'SKIPPED' | 'FAILED' }> = []

  for (const item of preview) {
    if (item.eligibility === 'SKIPPED') {
      skippedCount += 1
      results.push({ ...item, outcome: 'SKIPPED' })
      continue
    }
    if (item.eligibility === 'INELIGIBLE') {
      failedCount += 1
      results.push({ ...item, outcome: 'FAILED' })
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.facultyProfile.findUnique({
          where: { institutionId_id: { institutionId, id: item.profileId } },
        })
        if (!current) throw new Error('Faculty profile disappeared.')

        if (params.transitionType === 'DEPARTMENT_TRANSFER' && current.departmentId) {
          // Stamp existing unattributed historical faculty records with pre-transfer department
          await Promise.all([
            tx.facultyDevelopmentProgram.updateMany({
              where: { institutionId, facultyProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId },
            }),
            tx.facultyResearchGrant.updateMany({
              where: { institutionId, facultyProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId },
            }),
            tx.facultyConsultancy.updateMany({
              where: { institutionId, facultyProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId },
            }),
            tx.facultyContribution.updateMany({
              where: { institutionId, facultyProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId },
            }),
            tx.publicationContributor.updateMany({
              where: { institutionId, facultyProfileId: current.id, departmentId: null },
              data: { departmentId: current.departmentId },
            }),
          ])
        }

        const updateData: Record<string, unknown> = {}
        const eventBase = {
          institutionId,
          facultyProfileId: current.id,
          batchId: batch.id,
          eventType: params.transitionType,
          fromDepartmentId: current.departmentId,
          toDepartmentId: current.departmentId,
          fromDesignation: current.designation,
          toDesignation: current.designation,
          fromStatus: current.employmentStatus,
          toStatus: current.employmentStatus,
          effectiveDate,
          actorUserId: principal.userId,
          notes: params.reason ?? null,
        }

        switch (params.transitionType) {
          case 'DESIGNATION_CHANGE': {
            const next = params.targetDesignation!.trim()
            updateData.designation = next
            eventBase.toDesignation = next
            break
          }
          case 'DEPARTMENT_TRANSFER': {
            updateData.departmentId = params.targetDepartmentId
            eventBase.toDepartmentId = params.targetDepartmentId ?? null
            break
          }
          case 'STATUS_CHANGE': {
            const nextStatus = params.targetStatus ?? 'ACTIVE'
            updateData.employmentStatus = nextStatus
            eventBase.toStatus = nextStatus
            break
          }
          case 'RELIEVING': {
            updateData.employmentStatus = 'RELIEVED'
            updateData.relievingDate = effectiveDate
            eventBase.toStatus = 'RELIEVED'
            break
          }
          case 'RETIREMENT': {
            updateData.employmentStatus = 'RETIRED'
            updateData.retiredAt = effectiveDate
            eventBase.toStatus = 'RETIRED'
            break
          }
          case 'ARCHIVED': {
            updateData.employmentStatus = 'ARCHIVED'
            updateData.isArchived = true
            eventBase.toStatus = 'ARCHIVED'
            break
          }
        }

        await tx.facultyProfile.update({
          where: { institutionId_id: { institutionId, id: current.id } },
          data: updateData,
        })
        await tx.facultyLifecycleEvent.create({ data: eventBase })
      })

      succeededCount += 1
      results.push({ ...item, outcome: 'SUCCEEDED' })
    } catch (err) {
      failedCount += 1
      results.push({
        ...item,
        outcome: 'FAILED',
        reason: err instanceof Error ? err.message : 'Transition failed.',
      })
    }
  }

  await prisma.lifecycleTransitionBatch.update({
    where: { institutionId_id: { institutionId, id: batch.id } },
    data: { succeededCount, skippedCount, failedCount },
  })

  invalidateInstitutionOverviewCache(institutionId)
  return { batchId: batch.id, totalSelected: preview.length, succeededCount, skippedCount, failedCount, results }
}

export async function getLifecycleWorkspaceData(principal: AuthenticatedPrincipal) {
  requirePermission(principal, 'user:manage')
  const { institutionId } = principal

  const [academicYears, batches, departments, courses, students, faculties, studentEvents, facultyEvents] =
    await Promise.all([
      prisma.academicYear.findMany({ where: { institutionId }, orderBy: { startDate: 'desc' } }),
      prisma.batch.findMany({ where: { institutionId }, orderBy: { admissionYear: 'desc' } }),
      prisma.department.findMany({ where: { institutionId }, orderBy: { code: 'asc' } }),
      prisma.course.findMany({ where: { institutionId }, orderBy: { code: 'asc' } }),
      prisma.studentProfile.findMany({
        where: { institutionId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),
      prisma.facultyProfile.findMany({
        where: { institutionId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          department: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.studentLifecycleEvent.findMany({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.facultyLifecycleEvent.findMany({
        where: { institutionId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ])

  return {
    academicYears,
    batches,
    departments,
    courses,
    students,
    faculties,
    studentEvents,
    facultyEvents,
  }
}
