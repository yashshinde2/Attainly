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
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { institutionId, id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, role: { select: { key: true } } },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  return requests.map((r) => {
    const u = userMap.get(r.targetUserId)
    return {
      ...r,
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

const completeRequestSchema = z.object({
  requestId: z.string().min(1),
  responseNote: z.string().trim().max(1000).nullable().optional(),
  linkedEntityType: z.string().trim().max(60).nullable().optional(),
  linkedEntityId: z.string().trim().max(80).nullable().optional(),
  linkedDocumentId: z.string().trim().max(80).nullable().optional(),
})

export async function completeMyDataRequest(principal: AuthenticatedPrincipal, raw: unknown) {
  const data = completeRequestSchema.parse(raw)
  const existing = await prisma.dataCollectionRequest.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: data.requestId } },
  })
  if (!existing) throw new Error('Request not found.')
  if (existing.targetUserId !== principal.userId) {
    throw new AuthorizationError('You may only complete requests assigned to your account.')
  }
  return prisma.dataCollectionRequest.update({
    where: { institutionId_id: { institutionId: principal.institutionId, id: data.requestId } },
    data: {
      status: 'COMPLETED',
      responseNote: data.responseNote ?? null,
      linkedEntityType: data.linkedEntityType ?? null,
      linkedEntityId: data.linkedEntityId ?? null,
      linkedDocumentId: data.linkedDocumentId ?? null,
      completedAt: new Date(),
    },
  })
}
