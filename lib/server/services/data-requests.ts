import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import { AuthorizationError, requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'

const createRequestSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  targetType: z.enum(['DOCUMENT', 'ACHIEVEMENT', 'CERTIFICATION', 'PROFILE', 'FACULTY_FDP', 'FACULTY_RESEARCH', 'OTHER']).default('DOCUMENT'),
  targetUserIds: z.array(z.string().min(1)).min(1).max(200),
  departmentId: z.string().min(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  requireEvidence: z.boolean().default(false),
})

export async function createDataCollectionRequests(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const data = createRequestSchema.parse(raw)
  const allowedDepts = await resolveDepartmentScope(principal)
  if (data.departmentId) assertDepartmentAccess(allowedDepts, data.departmentId)

  const uniqueUsers = [...new Set(data.targetUserIds)]
  await prisma.dataCollectionRequest.createMany({
    data: uniqueUsers.map((targetUserId) => ({
      institutionId,
      title: data.title,
      description: data.description ?? null,
      targetType: data.targetType,
      targetUserId,
      departmentId: data.departmentId ?? null,
      dueDate: data.dueDate ?? null,
      requireEvidence: data.requireEvidence,
      status: 'PENDING',
      createdByUserId: principal.userId,
    })),
  })
  return { createdCount: uniqueUsers.length }
}

export async function listAdminDataRequests(principal: AuthenticatedPrincipal) {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)

  const requests = await prisma.dataCollectionRequest.findMany({
    where: {
      institutionId,
      ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const userIds = [...new Set(requests.map((r) => r.targetUserId))]
  const docIds = requests.map((r) => r.linkedDocumentId).filter((id): id is string => Boolean(id))

  const [users, docs] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { institutionId, id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, email: true, role: { select: { key: true } } },
        })
      : Promise.resolve([]),
    docIds.length
      ? prisma.document.findMany({
          where: { institutionId, id: { in: docIds } },
          select: { id: true, originalFilename: true },
        })
      : Promise.resolve([]),
  ])

  const userMap = new Map(users.map((u) => [u.id, u]))
  const docMap = new Map(docs.map((d) => [d.id, d.originalFilename]))
  const now = new Date()

  return requests.map((r) => {
    const u = userMap.get(r.targetUserId)
    const isOverdue = Boolean(r.dueDate && r.dueDate < now && r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
    return {
      ...r,
      isOverdue,
      linkedDocumentFilename: r.linkedDocumentId ? docMap.get(r.linkedDocumentId) ?? null : null,
      targetUserName: u ? `${u.firstName} ${u.lastName}` : 'User',
      targetUserEmail: u?.email ?? '',
      targetUserRole: u?.role.key ?? '',
    }
  })
}

export async function sendDataRequestReminder(principal: AuthenticatedPrincipal, requestId: string) {
  requirePermission(principal, 'report:view')
  const existing = await prisma.dataCollectionRequest.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: requestId } },
  })
  if (!existing) throw new Error('Data collection request not found.')
  return prisma.dataCollectionRequest.update({
    where: { institutionId_id: { institutionId: principal.institutionId, id: requestId } },
    data: {
      reminderCount: { increment: 1 },
      lastRemindedAt: new Date(),
    },
  })
}

export async function listMyDataRequests(principal: AuthenticatedPrincipal) {
  return prisma.dataCollectionRequest.findMany({
    where: {
      institutionId: principal.institutionId,
      targetUserId: principal.userId,
      status: { not: 'CANCELLED' },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function listMyDataRequestsWithOptions(principal: AuthenticatedPrincipal) {
  const { institutionId, userId } = principal
  const [requests, myDocuments, studentProfile, facultyProfile] = await Promise.all([
    listMyDataRequests(principal),
    prisma.document.findMany({
      where: { institutionId, ownerUserId: userId },
      select: { id: true, originalFilename: true, entityType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: {
        achievements: { select: { id: true, title: true }, take: 25, orderBy: { createdAt: 'desc' } },
        certifications: { select: { id: true, name: true }, take: 25, orderBy: { createdAt: 'desc' } },
        internships: { select: { id: true, organization: true }, take: 25, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: {
        developmentPrograms: { select: { id: true, title: true }, take: 25, orderBy: { createdAt: 'desc' } },
        certifications: { select: { id: true, name: true }, take: 25, orderBy: { createdAt: 'desc' } },
        researchPapers: { select: { id: true, title: true }, take: 25, orderBy: { createdAt: 'desc' } },
      },
    }),
  ])

  const myRecords: Array<{ entityType: string; entityId: string; label: string }> = []
  if (studentProfile) {
    for (const a of studentProfile.achievements) myRecords.push({ entityType: 'ACHIEVEMENT', entityId: a.id, label: `Achievement: ${a.title}` })
    for (const c of studentProfile.certifications) myRecords.push({ entityType: 'CERTIFICATION', entityId: c.id, label: `Certification: ${c.name}` })
    for (const i of studentProfile.internships) myRecords.push({ entityType: 'INTERNSHIP', entityId: i.id, label: `Internship: ${i.organization}` })
  }
  if (facultyProfile) {
    for (const f of facultyProfile.developmentPrograms) myRecords.push({ entityType: 'FACULTY_FDP', entityId: f.id, label: `FDP: ${f.title}` })
    for (const c of facultyProfile.certifications) myRecords.push({ entityType: 'FACULTY_CERTIFICATION', entityId: c.id, label: `Certification: ${c.name}` })
    for (const p of facultyProfile.researchPapers) myRecords.push({ entityType: 'FACULTY_RESEARCH_PAPER', entityId: p.id, label: `Paper: ${p.title}` })
  }

  return { requests, myDocuments, myRecords }
}

const completeRequestSchema = z.object({
  requestId: z.string().min(1),
  responseNote: z.string().trim().max(1000).nullable().optional(),
  linkedEntityType: z.string().trim().max(60).nullable().optional(),
  linkedEntityId: z.string().trim().max(80).nullable().optional(),
  linkedDocumentId: z.string().trim().max(80).nullable().optional(),
})

export async function completeMyDataRequest(principal: AuthenticatedPrincipal, raw: unknown) {
  const data = completeRequestSchema.parse(raw)
  const { institutionId, userId } = principal

  const existing = await prisma.dataCollectionRequest.findUnique({
    where: { institutionId_id: { institutionId, id: data.requestId } },
  })
  if (!existing) throw new Error('Request not found.')
  if (existing.targetUserId !== userId) {
    throw new AuthorizationError('You may only complete requests assigned to your account.')
  }

  if (existing.requireEvidence && !data.linkedDocumentId && !data.linkedEntityId) {
    throw new Error('Documentary evidence or a linked profile record is mandatory for this request.')
  }

  if (data.linkedDocumentId) {
    const doc = await prisma.document.findUnique({
      where: { institutionId_id: { institutionId, id: data.linkedDocumentId } },
      select: { ownerUserId: true },
    })
    if (!doc || doc.ownerUserId !== userId) {
      throw new AuthorizationError('Selected document does not belong to your account.')
    }
  }

  const nextStatus = existing.requireEvidence || data.linkedDocumentId || data.linkedEntityId ? 'SUBMITTED' : 'COMPLETED'

  return prisma.dataCollectionRequest.update({
    where: { institutionId_id: { institutionId, id: data.requestId } },
    data: {
      status: nextStatus,
      responseNote: data.responseNote ?? null,
      linkedEntityType: data.linkedEntityType ?? null,
      linkedEntityId: data.linkedEntityId ?? null,
      linkedDocumentId: data.linkedDocumentId ?? null,
      reviewFeedback: null,
      ...(nextStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
    },
  })
}

const reviewRequestSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(['COMPLETED', 'CORRECTION_REQUIRED']),
  reviewFeedback: z.string().trim().max(1000).nullable().optional(),
})

export async function reviewDataCollectionRequest(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const data = reviewRequestSchema.parse(raw)

  if (data.status === 'CORRECTION_REQUIRED' && !data.reviewFeedback?.trim()) {
    throw new Error('Please provide correction feedback when returning a request.')
  }

  const existing = await prisma.dataCollectionRequest.findUnique({
    where: { institutionId_id: { institutionId, id: data.requestId } },
  })
  if (!existing) throw new Error('Data collection request not found.')

  return prisma.dataCollectionRequest.update({
    where: { institutionId_id: { institutionId, id: data.requestId } },
    data: {
      status: data.status,
      reviewFeedback: data.status === 'CORRECTION_REQUIRED' ? data.reviewFeedback?.trim() ?? null : null,
      ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
    },
  })
}
