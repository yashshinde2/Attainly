import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import {
  DEFAULT_EVENT_CATEGORIES,
  checkEventEligibility,
  generateCertificateRef,
  mapCategoryToAchievementCategory,
  mapCategoryToLegacyType,
} from './event-rules'

const eventTypeEnum = z.enum(['TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL'])
const eventStatusEnum = z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'])
const eventModeEnum = z.enum(['ONLINE', 'OFFLINE', 'HYBRID'])
const eventLevelEnum = z.enum(['INSTITUTION', 'DEPARTMENT', 'INTER_COLLEGIATE', 'STATE', 'NATIONAL', 'INTERNATIONAL'])

const eventInput = z
  .object({
    departmentId: z.string().min(1),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(5000).nullable().optional(),
    type: eventTypeEnum.optional(),
    categoryCode: z.string().trim().min(1).max(60).nullable().optional(),
    subcategory: z.string().trim().max(120).nullable().optional(),
    status: eventStatusEnum.default('PUBLISHED'),
    coordinatorUserId: z.string().trim().max(80).nullable().optional(),
    venue: z.string().trim().max(240).nullable().optional(),
    mode: eventModeEnum.default('OFFLINE'),
    level: eventLevelEnum.default('INSTITUTION'),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    registrationDeadline: z.coerce.date().nullable().optional(),
    capacity: z.coerce.number().int().min(1).max(50000).nullable().optional(),
    allowTeamRegistration: z.boolean().default(false),
    maxTeamSize: z.coerce.number().int().min(2).max(50).nullable().optional(),
    eligibilityRoles: z.array(z.enum(['STUDENT', 'FACULTY'])).default(['STUDENT', 'FACULTY']),
    eligibleDepartmentIds: z.array(z.string().min(1)).default([]),
    eligibleBatches: z.array(z.coerce.number().int().min(1990).max(2100)).default([]),
    supportingDocUrls: z.array(z.string().trim().max(2000)).default([]),
    certificateTemplateEnabled: z.boolean().default(false),
  })
  .refine((event) => event.endsAt >= event.startsAt, {
    message: 'Event end must be later than or equal to its start.',
    path: ['endsAt'],
  })

const participationResultItem = z.object({
  userId: z.string().min(1),
  role: z.enum(['PARTICIPANT', 'WINNER', 'ORGANIZER']),
  position: z.string().trim().max(80).nullable().optional(),
  certificateUrl: z.string().trim().max(2000).nullable().optional(),
})

const resultInput = z.array(participationResultItem).min(1).max(500)

export type EventInput = z.infer<typeof eventInput> & { type: 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL' }
export type EventResultInput = z.infer<typeof resultInput>
export type ParticipationResultItem = z.infer<typeof participationResultItem>

export interface EventRepository<TEvent, TParticipation> {
  create(input: { institutionId: string; actorUserId: string; data: EventInput }): Promise<TEvent>
  update(input: { institutionId: string; eventId: string; data: Partial<EventInput> }): Promise<TEvent>
  archive(input: { institutionId: string; eventId: string }): Promise<void>
  list(input: { institutionId: string; departmentId?: string }): Promise<TEvent[]>
  getById(input: { institutionId: string; eventId: string }): Promise<TEvent | null>
  addParticipant(input: { institutionId: string; eventId: string; userId: string }): Promise<unknown>
  enterResults(input: { institutionId: string; eventId: string; results: EventResultInput }): Promise<void>
  listUserParticipations(input: { institutionId: string; userId: string }): Promise<TParticipation[]>
}

export async function createEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  data: unknown
}): Promise<TEvent> {
  requirePermission(input.principal, 'event:create')
  const parsed = eventInput.parse(input.data)
  const allowedDepts = await resolveDepartmentScope(input.principal)
  assertDepartmentAccess(allowedDepts, parsed.departmentId)
  const resolvedType = parsed.type ?? mapCategoryToLegacyType(parsed.categoryCode)
  return input.repository.create({
    institutionId: input.principal.institutionId,
    actorUserId: input.principal.userId,
    data: { ...parsed, type: resolvedType },
  })
}

export async function updateEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
  data: unknown
}): Promise<TEvent> {
  requirePermission(input.principal, 'event:create')
  const eventId = z.string().min(1).parse(input.eventId)
  const existing = await input.repository.getById({
    institutionId: input.principal.institutionId,
    eventId,
  })
  if (!existing) throw new Error('Event not found.')
  const allowedDepts = await resolveDepartmentScope(input.principal)
  const existingDeptId = (existing as { departmentId?: string }).departmentId ?? null
  assertDepartmentAccess(allowedDepts, existingDeptId)

  const parsed = eventInput.partial().parse(input.data)
  if (parsed.departmentId) assertDepartmentAccess(allowedDepts, parsed.departmentId)
  const resolvedType = parsed.type ?? (parsed.categoryCode ? mapCategoryToLegacyType(parsed.categoryCode) : undefined)
  return input.repository.update({
    institutionId: input.principal.institutionId,
    eventId,
    data: { ...parsed, ...(resolvedType ? { type: resolvedType } : {}) },
  })
}

export async function archiveEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
}): Promise<void> {
  requirePermission(input.principal, 'event:create')
  const eventId = z.string().min(1).parse(input.eventId)
  const existing = await input.repository.getById({
    institutionId: input.principal.institutionId,
    eventId,
  })
  if (existing) {
    const allowedDepts = await resolveDepartmentScope(input.principal)
    assertDepartmentAccess(allowedDepts, (existing as { departmentId?: string }).departmentId ?? null)
  }
  return input.repository.archive({
    institutionId: input.principal.institutionId,
    eventId,
  })
}

export async function listInstitutionEvents<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  departmentId?: string
}): Promise<TEvent[]> {
  return input.repository.list({
    institutionId: input.principal.institutionId,
    departmentId: input.departmentId,
  })
}

export async function getInstitutionEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
}): Promise<TEvent | null> {
  const eventId = z.string().min(1).parse(input.eventId)
  return input.repository.getById({
    institutionId: input.principal.institutionId,
    eventId,
  })
}

export async function registerForEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
}): Promise<unknown> {
  requirePermission(input.principal, 'event:participate')
  const eventId = z.string().min(1).parse(input.eventId)
  return input.repository.addParticipant({
    institutionId: input.principal.institutionId,
    eventId,
    userId: input.principal.userId,
  })
}

export async function enterEventResults<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
  results: unknown
}): Promise<void> {
  requirePermission(input.principal, 'event:enter_results')
  const eventId = z.string().min(1).parse(input.eventId)
  const results = resultInput.parse(input.results)
  if (new Set(results.map((result) => result.userId)).size !== results.length) {
    throw new Error('Each participant may only appear once per event result entry.')
  }
  const existing = await input.repository.getById({
    institutionId: input.principal.institutionId,
    eventId,
  })
  if (existing) {
    const allowedDepts = await resolveDepartmentScope(input.principal)
    assertDepartmentAccess(allowedDepts, (existing as { departmentId?: string }).departmentId ?? null)
  }
  await input.repository.enterResults({
    institutionId: input.principal.institutionId,
    eventId,
    results,
  })
  await confirmAndSyncEventParticipations(input.principal, eventId, results.map((r) => r.userId))
}

export async function listOwnEventParticipations<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
}): Promise<TParticipation[]> {
  return input.repository.listUserParticipations({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

// ============================================================================
// Phase 5 Extensions: Categories, Eligibility Registration, Attendance,
// Idempotent Profile Synchronization, Completion Summaries & Reports
// ============================================================================

const categoryConfigSchema = z.object({
  code: z.string().trim().min(2).max(50).transform((s) => s.toUpperCase().replace(/[^A-Z0-9_]/g, '_')),
  label: z.string().trim().min(2).max(100),
  subcategories: z.array(z.string().trim().min(1).max(80)).default([]),
  isActive: z.boolean().default(true),
})

export async function listEventCategories(principal: AuthenticatedPrincipal) {
  const existing = await prisma.eventCategoryConfig.findMany({
    where: { institutionId: principal.institutionId },
    orderBy: { label: 'asc' },
  })
  if (existing.length > 0) return existing

  // Auto-seed defaults on first access
  await prisma.eventCategoryConfig.createMany({
    data: DEFAULT_EVENT_CATEGORIES.map((c) => ({
      institutionId: principal.institutionId,
      code: c.code,
      label: c.label,
      subcategories: c.subcategories,
      isActive: true,
    })),
    skipDuplicates: true,
  })
  return prisma.eventCategoryConfig.findMany({
    where: { institutionId: principal.institutionId },
    orderBy: { label: 'asc' },
  })
}

export async function upsertEventCategory(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'event:create')
  const data = categoryConfigSchema.parse(raw)
  return prisma.eventCategoryConfig.upsert({
    where: { institutionId_code: { institutionId: principal.institutionId, code: data.code } },
    update: { label: data.label, subcategories: data.subcategories, isActive: data.isActive },
    create: { institutionId: principal.institutionId, ...data },
  })
}

const completionSchema = z.object({
  eventId: z.string().min(1),
  completionSummary: z.string().trim().min(1).max(5000),
  completionReportUrl: z.string().trim().max(2000).nullable().optional(),
  completionPhotoUrls: z.array(z.string().trim().max(2000)).max(20).default([]),
  feedbackSummary: z.string().trim().max(3000).nullable().optional(),
  markCompleted: z.boolean().default(true),
})

export async function saveEventCompletionSummary(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'event:create')
  const data = completionSchema.parse(raw)
  const event = await prisma.event.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: data.eventId } },
  })
  if (!event) throw new Error('Event not found.')
  const allowedDepts = await resolveDepartmentScope(principal)
  assertDepartmentAccess(allowedDepts, event.departmentId)

  return prisma.event.update({
    where: { institutionId_id: { institutionId: principal.institutionId, id: data.eventId } },
    data: {
      completionSummary: data.completionSummary,
      completionReportUrl: data.completionReportUrl ?? null,
      completionPhotoUrls: data.completionPhotoUrls,
      feedbackSummary: data.feedbackSummary ?? null,
      ...(data.markCompleted ? { status: 'COMPLETED', completedAt: new Date() } : {}),
    },
  })
}

export async function listDiscoverableEventsForUser(principal: AuthenticatedPrincipal) {
  const { institutionId, userId } = principal
  const [user, events, myParticipations] = await Promise.all([
    prisma.user.findUnique({
      where: { institutionId_id: { institutionId, id: userId } },
      select: {
        role: { select: { key: true } },
        student: { select: { departmentId: true, admissionYear: true } },
        faculty: { select: { departmentId: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        institutionId,
        status: { in: ['PUBLISHED', 'COMPLETED'] },
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { participation: true } },
      },
      orderBy: { startsAt: 'asc' },
    }),
    prisma.eventParticipation.findMany({
      where: { institutionId, userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const portalRole: 'STUDENT' | 'FACULTY' | 'ADMIN' =
    user?.role.key === 'STUDENT' ? 'STUDENT' : user?.role.key === 'FACULTY' ? 'FACULTY' : 'ADMIN'
  const departmentId = user?.student?.departmentId ?? user?.faculty?.departmentId ?? null
  const admissionYear = user?.student?.admissionYear ?? null
  const myByEvent = new Map(myParticipations.map((p) => [p.eventId, p]))

  return events.map((evt) => {
    const myParticipation = myByEvent.get(evt.id) ?? null
    const isActiveReg =
      myParticipation !== null && myParticipation.registrationStatus !== 'CANCELLED'
    const eligibility = checkEventEligibility(
      {
        status: evt.status,
        registrationDeadline: evt.registrationDeadline,
        capacity: evt.capacity,
        eligibilityRoles: evt.eligibilityRoles,
        eligibleDepartmentIds: evt.eligibleDepartmentIds,
        eligibleBatches: evt.eligibleBatches,
        currentParticipantCount: evt._count.participation,
        isAlreadyRegistered: isActiveReg,
      },
      { portalRole, departmentId, admissionYear },
    )
    return {
      ...evt,
      myParticipation,
      eligibility,
    }
  })
}

const detailedRegistrationSchema = z.object({
  eventId: z.string().min(1),
  teamName: z.string().trim().max(120).nullable().optional(),
  teamRole: z.enum(['LEADER', 'MEMBER']).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

export async function registerForEventWithEligibility(
  principal: AuthenticatedPrincipal,
  raw: unknown,
) {
  requirePermission(principal, 'event:participate')
  const { institutionId, userId } = principal
  const data = detailedRegistrationSchema.parse(raw)

  const [event, user, existing] = await Promise.all([
    prisma.event.findUnique({
      where: { institutionId_id: { institutionId, id: data.eventId } },
      include: { _count: { select: { participation: true } } },
    }),
    prisma.user.findUnique({
      where: { institutionId_id: { institutionId, id: userId } },
      select: {
        role: { select: { key: true } },
        student: { select: { departmentId: true, admissionYear: true } },
        faculty: { select: { departmentId: true } },
      },
    }),
    prisma.eventParticipation.findUnique({
      where: { institutionId_eventId_userId: { institutionId, eventId: data.eventId, userId } },
    }),
  ])

  if (!event) throw new Error('Event not found.')
  if (existing && ['CONFIRMED', 'ATTENDED'].includes(existing.registrationStatus)) {
    throw new Error('Your participation is already confirmed for this event.')
  }

  const portalRole: 'STUDENT' | 'FACULTY' | 'ADMIN' =
    user?.role.key === 'STUDENT' ? 'STUDENT' : user?.role.key === 'FACULTY' ? 'FACULTY' : 'ADMIN'
  const eligibility = checkEventEligibility(
    {
      status: event.status,
      registrationDeadline: event.registrationDeadline,
      capacity: event.capacity,
      eligibilityRoles: event.eligibilityRoles,
      eligibleDepartmentIds: event.eligibleDepartmentIds,
      eligibleBatches: event.eligibleBatches,
      currentParticipantCount: event._count.participation,
      isAlreadyRegistered: existing !== null && existing.registrationStatus !== 'CANCELLED',
    },
    {
      portalRole,
      departmentId: user?.student?.departmentId ?? user?.faculty?.departmentId ?? null,
      admissionYear: user?.student?.admissionYear ?? null,
    },
  )

  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'You are not eligible to register for this event.')
  }

  if (data.teamName && !event.allowTeamRegistration) {
    throw new Error('This event does not accept team registrations.')
  }

  return prisma.eventParticipation.upsert({
    where: { institutionId_eventId_userId: { institutionId, eventId: data.eventId, userId } },
    create: {
      institutionId,
      eventId: data.eventId,
      userId,
      role: 'PARTICIPANT',
      registrationStatus: 'REGISTERED',
      attendanceStatus: 'PENDING',
      teamName: data.teamName ?? null,
      teamRole: data.teamName ? (data.teamRole ?? 'MEMBER') : null,
      notes: data.notes ?? null,
    },
    update: {
      registrationStatus: 'REGISTERED',
      teamName: data.teamName ?? null,
      teamRole: data.teamName ? (data.teamRole ?? 'MEMBER') : null,
      notes: data.notes ?? null,
    },
  })
}

export async function cancelEventRegistration(principal: AuthenticatedPrincipal, eventId: string) {
  requirePermission(principal, 'event:participate')
  const existing = await prisma.eventParticipation.findUnique({
    where: {
      institutionId_eventId_userId: {
        institutionId: principal.institutionId,
        eventId,
        userId: principal.userId,
      },
    },
  })
  if (!existing) throw new Error('Registration not found.')
  if (['CONFIRMED', 'ATTENDED'].includes(existing.registrationStatus)) {
    throw new Error('Cannot cancel after participation has been confirmed.')
  }
  return prisma.eventParticipation.update({
    where: {
      institutionId_eventId_userId: {
        institutionId: principal.institutionId,
        eventId,
        userId: principal.userId,
      },
    },
    data: { registrationStatus: 'CANCELLED' },
  })
}

const bulkImportSchema = z.object({
  eventId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1).max(500),
  role: z.enum(['PARTICIPANT', 'WINNER', 'ORGANIZER']).default('PARTICIPANT'),
  registrationStatus: z.enum(['REGISTERED', 'CONFIRMED']).default('REGISTERED'),
  teamName: z.string().trim().max(120).nullable().optional(),
})

export async function bulkImportEventParticipants(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'event:enter_results')
  const { institutionId } = principal
  const data = bulkImportSchema.parse(raw)
  const event = await prisma.event.findUnique({
    where: { institutionId_id: { institutionId, id: data.eventId } },
  })
  if (!event) throw new Error('Event not found.')
  const allowedDepts = await resolveDepartmentScope(principal)
  assertDepartmentAccess(allowedDepts, event.departmentId)

  const uniqueIds = [...new Set(data.userIds)]
  await prisma.$transaction(async (tx) => {
    for (const uid of uniqueIds) {
      await tx.eventParticipation.upsert({
        where: { institutionId_eventId_userId: { institutionId, eventId: data.eventId, userId: uid } },
        create: {
          institutionId,
          eventId: data.eventId,
          userId: uid,
          role: data.role,
          registrationStatus: data.registrationStatus,
          attendanceStatus: data.registrationStatus === 'CONFIRMED' ? 'PRESENT' : 'PENDING',
          teamName: data.teamName ?? null,
          ...(data.registrationStatus === 'CONFIRMED'
            ? { confirmedAt: new Date(), confirmedByUserId: principal.userId }
            : {}),
        },
        update: {
          role: data.role,
          ...(data.teamName ? { teamName: data.teamName } : {}),
        },
      })
    }
  })

  if (data.registrationStatus === 'CONFIRMED') {
    await confirmAndSyncEventParticipations(principal, data.eventId, uniqueIds)
  }
}

const attendanceUpdateSchema = z.object({
  eventId: z.string().min(1),
  entries: z
    .array(
      z.object({
        userId: z.string().min(1),
        attendanceStatus: z.enum(['PENDING', 'PRESENT', 'ABSENT']),
        confirmParticipation: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(500),
})

export async function updateEventAttendance(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'event:enter_results')
  const { institutionId } = principal
  const data = attendanceUpdateSchema.parse(raw)
  const event = await prisma.event.findUnique({
    where: { institutionId_id: { institutionId, id: data.eventId } },
  })
  if (!event) throw new Error('Event not found.')
  const allowedDepts = await resolveDepartmentScope(principal)
  assertDepartmentAccess(allowedDepts, event.departmentId)

  const toSync: string[] = []
  await prisma.$transaction(async (tx) => {
    for (const entry of data.entries) {
      const regStatus =
        entry.attendanceStatus === 'PRESENT' && entry.confirmParticipation
          ? 'CONFIRMED'
          : entry.attendanceStatus === 'ABSENT'
            ? 'ABSENT'
            : undefined

      await tx.eventParticipation.update({
        where: {
          institutionId_eventId_userId: {
            institutionId,
            eventId: data.eventId,
            userId: entry.userId,
          },
        },
        data: {
          attendanceStatus: entry.attendanceStatus,
          ...(regStatus ? { registrationStatus: regStatus } : {}),
          ...(entry.confirmParticipation && entry.attendanceStatus === 'PRESENT'
            ? { confirmedAt: new Date(), confirmedByUserId: principal.userId }
            : {}),
        },
      })

      if (entry.confirmParticipation && entry.attendanceStatus === 'PRESENT') {
        toSync.push(entry.userId)
      }
    }
  })

  if (toSync.length > 0) {
    await confirmAndSyncEventParticipations(principal, data.eventId, toSync)
  }
}

/**
 * Idempotently confirms participation (sets registrationStatus='CONFIRMED', attendanceStatus='PRESENT',
 * issues unique certificateRef if enabled) and creates or updates corresponding Student Achievement
 * and FacultyContribution records linked via sourceEventId.
 * Running this multiple times for the same event/user NEVER creates duplicate profile records.
 */
export async function confirmAndSyncEventParticipations(
  principal: AuthenticatedPrincipal,
  eventId: string,
  targetUserIds?: string[],
): Promise<{ syncedStudents: number; syncedFaculty: number }> {
  requirePermission(principal, 'event:enter_results')
  const { institutionId } = principal

  const event = await prisma.event.findUnique({
    where: { institutionId_id: { institutionId, id: eventId } },
    include: {
      institution: { select: { name: true } },
      department: { select: { name: true, code: true } },
    },
  })
  if (!event) throw new Error('Event not found.')
  const allowedDepts = await resolveDepartmentScope(principal)
  assertDepartmentAccess(allowedDepts, event.departmentId)

  const participations = await prisma.eventParticipation.findMany({
    where: {
      institutionId,
      eventId,
      ...(targetUserIds?.length ? { userId: { in: targetUserIds } } : {}),
      registrationStatus: { notIn: ['CANCELLED', 'ABSENT'] },
    },
    include: {
      user: {
        select: {
          id: true,
          student: { select: { id: true } },
          faculty: { select: { id: true } },
        },
      },
    },
  })

  const organizerName = `${event.institution.name} (${event.department.code})`
  const eventYear = new Date(event.startsAt).getFullYear()
  const achCategory = mapCategoryToAchievementCategory(event.categoryCode, event.type)
  let syncedStudents = 0
  let syncedFaculty = 0

  await prisma.$transaction(async (tx) => {
    for (const part of participations) {
      const certRef =
        part.certificateRef ??
        (event.certificateTemplateEnabled ? generateCertificateRef(event.id, part.userId, eventYear) : null)

      let syncedAchievementId = part.syncedAchievementId
      let syncedContributionId = part.syncedContributionId

      if (part.user.student) {
        const achStatus = part.role === 'WINNER' ? 'WINNER' : 'PARTICIPATION'
        const achievement = await tx.achievement.upsert({
          where: {
            institutionId_studentProfileId_sourceEventId: {
              institutionId,
              studentProfileId: part.user.student.id,
              sourceEventId: event.id,
            },
          },
          create: {
            institutionId,
            studentProfileId: part.user.student.id,
            sourceEventId: event.id,
            title: event.title,
            category: achCategory,
            categoryCode: event.categoryCode ?? event.type,
            subcategory: event.subcategory ?? null,
            status: achStatus,
            participationLevel: event.level,
            teamType: part.teamName ? 'TEAM' : 'INDIVIDUAL',
            teamName: part.teamName ?? null,
            result: part.position ?? (part.role === 'WINNER' ? 'Winner' : part.role === 'ORGANIZER' ? 'Organizer' : 'Participated'),
            organizer: organizerName,
            role: part.role,
            documentUrls: part.certificateUrl ? [part.certificateUrl] : [],
            verificationStatus: 'VERIFIED',
            verifiedByUserId: principal.userId,
            verifiedAt: new Date(),
            awardedAt: event.endsAt,
            description: event.description ?? null,
          },
          update: {
            title: event.title,
            category: achCategory,
            categoryCode: event.categoryCode ?? event.type,
            subcategory: event.subcategory ?? null,
            status: achStatus,
            participationLevel: event.level,
            teamType: part.teamName ? 'TEAM' : 'INDIVIDUAL',
            teamName: part.teamName ?? null,
            result: part.position ?? (part.role === 'WINNER' ? 'Winner' : part.role === 'ORGANIZER' ? 'Organizer' : 'Participated'),
            organizer: organizerName,
            role: part.role,
            ...(part.certificateUrl ? { documentUrls: [part.certificateUrl] } : {}),
            verificationStatus: 'VERIFIED',
            verifiedByUserId: principal.userId,
            verifiedAt: new Date(),
            awardedAt: event.endsAt,
          },
        })
        syncedAchievementId = achievement.id
        syncedStudents++
      }

      if (part.user.faculty) {
        const contributionType =
          part.role === 'ORGANIZER'
            ? 'EVENT_ORGANIZATION'
            : part.role === 'WINNER'
              ? 'EVENT_RECOGNITION'
              : 'EVENT_PARTICIPATION'
        const contribution = await tx.facultyContribution.upsert({
          where: {
            institutionId_facultyProfileId_sourceEventId: {
              institutionId,
              facultyProfileId: part.user.faculty.id,
              sourceEventId: event.id,
            },
          },
          create: {
            institutionId,
            facultyProfileId: part.user.faculty.id,
            sourceEventId: event.id,
            contributionType,
            title: event.title,
            organizationOrBody: organizerName,
            role: part.position ? `${part.role} (${part.position})` : part.role,
            startDate: event.startsAt,
            endDate: event.endsAt,
            description: event.description ?? null,
            documentUrl: part.certificateUrl ?? null,
            verificationStatus: 'VERIFIED',
            verifiedByUserId: principal.userId,
            verifiedAt: new Date(),
          },
          update: {
            contributionType,
            title: event.title,
            organizationOrBody: organizerName,
            role: part.position ? `${part.role} (${part.position})` : part.role,
            startDate: event.startsAt,
            endDate: event.endsAt,
            ...(part.certificateUrl ? { documentUrl: part.certificateUrl } : {}),
            verificationStatus: 'VERIFIED',
            verifiedByUserId: principal.userId,
            verifiedAt: new Date(),
          },
        })
        syncedContributionId = contribution.id
        syncedFaculty++
      }

      await tx.eventParticipation.update({
        where: {
          institutionId_eventId_userId: {
            institutionId,
            eventId: event.id,
            userId: part.userId,
          },
        },
        data: {
          registrationStatus: 'CONFIRMED',
          attendanceStatus: part.attendanceStatus === 'ABSENT' ? 'ABSENT' : 'PRESENT',
          confirmedAt: part.confirmedAt ?? new Date(),
          confirmedByUserId: part.confirmedByUserId ?? principal.userId,
          certificateRef: certRef,
          syncedAchievementId,
          syncedContributionId,
        },
      })
    }
  })

  return { syncedStudents, syncedFaculty }
}

export async function getEventReportsSummary(
  principal: AuthenticatedPrincipal,
  filters?: { departmentId?: string; academicYearId?: string },
) {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)
  if (filters?.departmentId) assertDepartmentAccess(allowedDepts, filters.departmentId)

  let dateFilter: { gte?: Date; lte?: Date } | undefined
  if (filters?.academicYearId) {
    const ay = await prisma.academicYear.findUnique({
      where: { institutionId_id: { institutionId, id: filters.academicYearId } },
    })
    if (ay) dateFilter = { gte: ay.startDate, lte: ay.endDate }
  }

  const eventWhere = {
    institutionId,
    ...(filters?.departmentId
      ? { departmentId: filters.departmentId }
      : allowedDepts
        ? { departmentId: { in: allowedDepts } }
        : {}),
    ...(dateFilter ? { startsAt: dateFilter } : {}),
  }

  const events = await prisma.event.findMany({
    where: eventWhere,
    include: {
      department: { select: { id: true, name: true, code: true } },
      participation: {
        select: {
          registrationStatus: true,
          attendanceStatus: true,
          role: true,
          certificateRef: true,
          syncedAchievementId: true,
          syncedContributionId: true,
        },
      },
    },
    orderBy: { startsAt: 'desc' },
  })

  const deptStatsMap = new Map<
    string,
    { departmentId: string; code: string; name: string; events: number; completed: number; registrations: number; attended: number; winners: number }
  >()
  const categoryMap = new Map<string, { category: string; events: number; participants: number }>()

  let totalRegistrations = 0
  let totalConfirmedOrAttended = 0
  let totalWinners = 0
  let certificatesIssued = 0
  let syncedRecords = 0

  const eventRows = events.map((evt) => {
    const activeParts = evt.participation.filter((p) => p.registrationStatus !== 'CANCELLED')
    const attendedCount = activeParts.filter(
      (p) => p.attendanceStatus === 'PRESENT' || p.registrationStatus === 'CONFIRMED' || p.registrationStatus === 'ATTENDED',
    ).length
    const absentCount = activeParts.filter((p) => p.attendanceStatus === 'ABSENT').length
    const winnersCount = activeParts.filter((p) => p.role === 'WINNER').length
    const certsCount = activeParts.filter((p) => Boolean(p.certificateRef)).length
    const syncedCount = activeParts.filter((p) => Boolean(p.syncedAchievementId || p.syncedContributionId)).length

    totalRegistrations += activeParts.length
    totalConfirmedOrAttended += attendedCount
    totalWinners += winnersCount
    certificatesIssued += certsCount
    syncedRecords += syncedCount

    const deptEntry = deptStatsMap.get(evt.departmentId) ?? {
      departmentId: evt.departmentId,
      code: evt.department.code,
      name: evt.department.name,
      events: 0,
      completed: 0,
      registrations: 0,
      attended: 0,
      winners: 0,
    }
    deptEntry.events += 1
    if (evt.status === 'COMPLETED') deptEntry.completed += 1
    deptEntry.registrations += activeParts.length
    deptEntry.attended += attendedCount
    deptEntry.winners += winnersCount
    deptStatsMap.set(evt.departmentId, deptEntry)

    const catKey = evt.categoryCode ?? evt.type
    const catEntry = categoryMap.get(catKey) ?? { category: catKey, events: 0, participants: 0 }
    catEntry.events += 1
    catEntry.participants += activeParts.length
    categoryMap.set(catKey, catEntry)

    return {
      id: evt.id,
      title: evt.title,
      departmentName: evt.department.name,
      departmentCode: evt.department.code,
      category: catKey,
      subcategory: evt.subcategory,
      level: evt.level,
      mode: evt.mode,
      status: evt.status,
      startsAt: evt.startsAt,
      endsAt: evt.endsAt,
      registeredCount: activeParts.length,
      attendedCount,
      absentCount,
      winnersCount,
      certificatesIssued: certsCount,
      hasCompletionSummary: Boolean(evt.completionSummary),
    }
  })

  return {
    kpis: {
      totalEvents: events.length,
      publishedEvents: events.filter((e) => e.status === 'PUBLISHED').length,
      completedEvents: events.filter((e) => e.status === 'COMPLETED').length,
      draftEvents: events.filter((e) => e.status === 'DRAFT').length,
      totalRegistrations,
      totalConfirmedOrAttended,
      totalWinners,
      certificatesIssued,
      syncedRecords,
    },
    departmentStats: Array.from(deptStatsMap.values()).sort((a, b) => b.events - a.events),
    categoryStats: Array.from(categoryMap.values()).sort((a, b) => b.events - a.events),
    eventRows,
  }
}
