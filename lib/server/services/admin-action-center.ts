import 'server-only'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '@/lib/server/authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { createDataCollectionRequests } from './data-requests'

export async function getAdminActionCenterData(
  principal: AuthenticatedPrincipal,
  options: { page?: number; pageSize?: number } = {},
) {
  const canVerify = principal.permissions.includes('record:verify')
  const canViewReports = principal.permissions.includes('report:view')
  if (!canVerify && !canViewReports) {
    requirePermission(principal, 'report:view')
  }

  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)
  const pageSize = Math.min(Math.max(options.pageSize ?? 15, 5), 50)
  const page = Math.max(options.page ?? 1, 1)
  const now = new Date()

  const deptStudentWhere = allowedDepts ? { departmentId: { in: allowedDepts } } : {}
  const deptFacultyWhere = allowedDepts ? { departmentId: { in: allowedDepts } } : {}

  const [
    assignedCount,
    assignedItems,
    overdueRequestsCount,
    overdueRequests,
    rejectedAchievementsCount,
    upcomingEvents,
    missingEnrollmentCount,
    missingEmployeeIdCount,
    savedReports,
    assignmentRules,
    campaignTemplates,
    reminderRules,
    recentAuditLogs,
    departments,
    reviewers,
  ] = await Promise.all([
    canVerify
      ? prisma.verificationAssignment.count({
          where: { institutionId, assignedToUserId: principal.userId },
        })
      : Promise.resolve(0),
    canVerify
      ? prisma.verificationAssignment.findMany({
          where: { institutionId, assignedToUserId: principal.userId },
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        })
      : Promise.resolve([]),
    prisma.dataCollectionRequest.count({
      where: {
        institutionId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: now },
        ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
      },
    }),
    prisma.dataCollectionRequest.findMany({
      where: {
        institutionId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: now },
        ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
      },
      orderBy: { dueDate: 'asc' },
      take: pageSize,
    }),
    prisma.achievement.count({
      where: {
        institutionId,
        verificationStatus: 'REJECTED',
        studentProfile: deptStudentWhere,
      },
    }),
    prisma.event.findMany({
      where: {
        institutionId,
        ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
        status: { in: ['PUBLISHED', 'ONGOING'] },
      },
      orderBy: { startsAt: 'asc' },
      take: 8,
      select: {
        id: true,
        title: true,
        startsAt: true,
        status: true,
        department: { select: { code: true } },
        _count: { select: { participation: true } },
      },
    }),
    prisma.studentProfile.count({
      where: { institutionId, enrollmentNumber: null, ...deptStudentWhere },
    }),
    prisma.facultyProfile.count({
      where: { institutionId, employeeId: null, ...deptFacultyWhere },
    }),
    prisma.savedReport.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { id: true, name: true, entityType: true, createdAt: true },
    }),
    prisma.reviewerAssignmentRule.findMany({
      where: {
        institutionId,
        ...(allowedDepts ? { departmentId: { in: allowedDepts } } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.dataCollectionTemplate.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 25,
    }),
    prisma.adminReminderRule.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.verificationAuditLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.department.findMany({
      where: {
        institutionId,
        ...(allowedDepts ? { id: { in: allowedDepts } } : {}),
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        institutionId,
        isActive: true,
        role: {
          rolePermissions: { some: { permission: { key: 'record:verify' } } },
        },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  return {
    summary: {
      assignedTasks: assignedCount,
      overdueRequests: overdueRequestsCount,
      pendingCorrections: rejectedAchievementsCount,
      upcomingEvents: upcomingEvents.length,
      dataQualityIssues: missingEnrollmentCount + missingEmployeeIdCount,
      missingEnrollmentCount,
      missingEmployeeIdCount,
    },
    assignedItems,
    overdueRequests,
    upcomingEvents,
    savedReports,
    assignmentRules,
    campaignTemplates,
    reminderRules,
    recentAuditLogs,
    departments,
    reviewers: reviewers.map((r) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      email: r.email,
    })),
    page,
    pageSize,
  }
}

export async function createReviewerAssignmentRule(
  principal: AuthenticatedPrincipal,
  input: {
    departmentId?: string | null
    itemType?: string
    reviewerUserId: string
    priority?: number
  },
) {
  requirePermission(principal, 'record:verify')
  const allowedDepts = await resolveDepartmentScope(principal)
  if (input.departmentId) assertDepartmentAccess(allowedDepts, input.departmentId)
  if (!input.departmentId && allowedDepts !== null) {
    throw new Error('Department coordinators must specify an assigned department for assignment rules.')
  }

  return prisma.reviewerAssignmentRule.create({
    data: {
      institutionId: principal.institutionId,
      departmentId: input.departmentId ?? null,
      itemType: input.itemType || 'ALL',
      reviewerUserId: input.reviewerUserId,
      priority: input.priority ?? 0,
      isActive: true,
    },
  })
}

export async function deleteReviewerAssignmentRule(
  principal: AuthenticatedPrincipal,
  ruleId: string,
) {
  requirePermission(principal, 'record:verify')
  const rule = await prisma.reviewerAssignmentRule.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: ruleId } },
  })
  if (!rule) throw new Error('Assignment rule not found.')
  const allowedDepts = await resolveDepartmentScope(principal)
  if (rule.departmentId) assertDepartmentAccess(allowedDepts, rule.departmentId)

  await prisma.reviewerAssignmentRule.delete({
    where: { institutionId_id: { institutionId: principal.institutionId, id: ruleId } },
  })
}

export async function createCampaignTemplate(
  principal: AuthenticatedPrincipal,
  input: {
    name: string
    title: string
    description?: string | null
    targetType?: string
    requireEvidence?: boolean
    defaultDueDays?: number
  },
) {
  requirePermission(principal, 'report:view')
  return prisma.dataCollectionTemplate.create({
    data: {
      institutionId: principal.institutionId,
      name: input.name.trim(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      targetType: input.targetType || 'DOCUMENT',
      requireEvidence: Boolean(input.requireEvidence),
      defaultDueDays: Math.min(Math.max(Number(input.defaultDueDays ?? 7), 1), 180),
      createdByUserId: principal.userId,
    },
  })
}

export async function deleteCampaignTemplate(
  principal: AuthenticatedPrincipal,
  templateId: string,
) {
  requirePermission(principal, 'report:view')
  await prisma.dataCollectionTemplate.deleteMany({
    where: { institutionId: principal.institutionId, id: templateId },
  })
}

export async function launchCampaignFromTemplate(
  principal: AuthenticatedPrincipal,
  input: {
    templateId: string
    targetRole?: 'STUDENT' | 'FACULTY'
    departmentId?: string | null
  },
) {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)
  if (input.departmentId) assertDepartmentAccess(allowedDepts, input.departmentId)

  const template = await prisma.dataCollectionTemplate.findUnique({
    where: { institutionId_id: { institutionId, id: input.templateId } },
  })
  if (!template) throw new Error('Campaign template not found.')

  const effectiveDepts = input.departmentId ? [input.departmentId] : allowedDepts
  const roleKey = input.targetRole ?? 'STUDENT'

  const users = await prisma.user.findMany({
    where: {
      institutionId,
      isActive: true,
      role: { key: roleKey },
      ...(effectiveDepts
        ? roleKey === 'STUDENT'
          ? { student: { departmentId: { in: effectiveDepts } } }
          : { faculty: { departmentId: { in: effectiveDepts } } }
        : {}),
    },
    take: 200,
    select: { id: true },
  })
  if (users.length === 0) {
    throw new Error(`No active ${roleKey.toLowerCase()} recipients found in the selected scope.`)
  }

  const dueDate = new Date(Date.now() + template.defaultDueDays * 24 * 60 * 60 * 1000)
  return createDataCollectionRequests(principal, {
    title: template.title,
    description: template.description,
    targetType: template.targetType,
    targetUserIds: users.map((u) => u.id),
    departmentId: input.departmentId ?? null,
    dueDate,
    requireEvidence: template.requireEvidence,
  })
}

export async function createReminderRule(
  principal: AuthenticatedPrincipal,
  input: {
    name: string
    targetScope?: string
    daysBeforeDue?: number
    sendOverdueDigest?: boolean
  },
) {
  requirePermission(principal, 'report:view')
  return prisma.adminReminderRule.create({
    data: {
      institutionId: principal.institutionId,
      name: input.name.trim(),
      targetScope: input.targetScope || 'DATA_REQUESTS',
      daysBeforeDue: Math.min(Math.max(Number(input.daysBeforeDue ?? 2), 0), 30),
      sendOverdueDigest: input.sendOverdueDigest ?? true,
      isActive: true,
      createdByUserId: principal.userId,
    },
  })
}

export async function runDurableRemindersForInstitution(institutionId: string) {
  const rules = await prisma.adminReminderRule.findMany({
    where: { institutionId, isActive: true },
  })
  if (rules.length === 0) return { rulesProcessed: 0, remindersDispatched: 0 }

  let remindersDispatched = 0
  const now = new Date()
  const cooldownCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  for (const rule of rules) {
    const dueHorizon = new Date(Date.now() + rule.daysBeforeDue * 24 * 60 * 60 * 1000)
    const eligibleRequests = await prisma.dataCollectionRequest.findMany({
      where: {
        institutionId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lte: dueHorizon },
        OR: [{ lastRemindedAt: null }, { lastRemindedAt: { lt: cooldownCutoff } }],
      },
      select: { id: true },
      take: 200,
    })

    if (eligibleRequests.length > 0) {
      await prisma.dataCollectionRequest.updateMany({
        where: { institutionId, id: { in: eligibleRequests.map((r) => r.id) } },
        data: {
          lastRemindedAt: now,
          reminderCount: { increment: 1 },
        },
      })
      remindersDispatched += eligibleRequests.length
    }

    await prisma.adminReminderRule.update({
      where: { institutionId_id: { institutionId, id: rule.id } },
      data: {
        lastRunAt: now,
        lastNotifiedCount: eligibleRequests.length,
      },
    })
  }

  return { rulesProcessed: rules.length, remindersDispatched }
}
