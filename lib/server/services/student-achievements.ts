import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { prisma } from '@/lib/server/db'
import { PrismaDocumentRepository } from '../repositories/document-repository'
import type { Achievement, AchievementCategoryConfig } from '@/generated/prisma/client'

const documentRepository = new PrismaDocumentRepository()

const achievementInput = z.object({
  title: z.string().trim().min(1).max(180),
  category: z.enum(['TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL']),
  categoryCode: z.string().trim().max(60).nullable().optional(),
  subcategory: z.string().trim().max(120).nullable().optional(),
  status: z.enum(['PARTICIPATION', 'WINNER']),
  participationLevel: z.string().trim().max(60).nullable().optional(),
  teamType: z.string().trim().max(40).nullable().optional(),
  teamName: z.string().trim().max(120).nullable().optional(),
  result: z.string().trim().max(120).nullable().optional(),
  organizer: z.string().trim().max(180).nullable().optional(),
  role: z.string().trim().max(120).nullable().optional(),
  documentUrls: z.array(z.string().trim().max(2000)).max(10).default([]),
  description: z.string().trim().max(2000).nullable().optional(),
  awardedAt: z.coerce.date().nullable().optional(),
})

export type StudentAchievementInput = z.infer<typeof achievementInput>

export interface StudentAchievementRepository<TAchievement> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TAchievement[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentAchievementInput }): Promise<TAchievement>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentAchievementInput }): Promise<TAchievement>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

async function validateDocumentUrls(principal: AuthenticatedPrincipal, urls: string[]) {
  for (const url of urls) {
    await documentRepository.assertOwnedDocumentReference({
      institutionId: principal.institutionId,
      ownerUserId: principal.userId,
      fileUrl: url,
    })
  }
}

export async function listInstitutionAchievementCategories(input: {
  principal: AuthenticatedPrincipal
}): Promise<AchievementCategoryConfig[]> {
  requirePermission(input.principal, 'achievement:read_own')
  return prisma.achievementCategoryConfig.findMany({
    where: { institutionId: input.principal.institutionId, isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function listOwnAchievements<TAchievement>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentAchievementRepository<TAchievement>
}): Promise<TAchievement[]> {
  requirePermission(input.principal, 'achievement:read_own')
  return input.repository.listByUser({ institutionId: input.principal.institutionId, userId: input.principal.userId })
}

export async function listOwnAchievementsPaginated(input: {
  principal: AuthenticatedPrincipal
  page?: number
  pageSize?: number
  categoryCode?: string
}): Promise<{ items: Achievement[]; total: number; page: number; pageSize: number }> {
  requirePermission(input.principal, 'achievement:read_own')
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10))
  const where = {
    institutionId: input.principal.institutionId,
    studentProfile: { userId: input.principal.userId },
    ...(input.categoryCode ? { categoryCode: input.categoryCode } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.achievement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.achievement.count({ where }),
  ])

  return { items, total, page, pageSize }
}

export async function addOwnAchievement<TAchievement>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentAchievementRepository<TAchievement>
  data: unknown
}): Promise<TAchievement> {
  requirePermission(input.principal, 'achievement:create_own')
  const data = achievementInput.parse(input.data)
  await validateDocumentUrls(input.principal, data.documentUrls)

  const profile = await prisma.studentProfile.findUnique({
    where: { institutionId_userId: { institutionId: input.principal.institutionId, userId: input.principal.userId } },
    select: { id: true },
  })
  if (profile) {
    const existing = await prisma.achievement.findFirst({
      where: {
        institutionId: input.principal.institutionId,
        studentProfileId: profile.id,
        category: data.category,
        title: { equals: data.title, mode: 'insensitive' },
        verificationStatus: { not: 'REJECTED' },
      },
    })
    if (existing) {
      throw new Error(`An achievement titled "${data.title}" under category "${data.category}" already exists.`)
    }
  }

  return input.repository.createByUser({ institutionId: input.principal.institutionId, userId: input.principal.userId, data })
}

export async function updateOwnAchievement<TAchievement>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentAchievementRepository<TAchievement>
  id: string
  data: unknown
}): Promise<TAchievement> {
  const perm = input.principal.permissions.includes('achievement:edit_own') ? 'achievement:edit_own' : 'student_profile:edit_own'
  requirePermission(input.principal, perm)
  const data = achievementInput.parse(input.data)
  await validateDocumentUrls(input.principal, data.documentUrls)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnAchievement<TAchievement>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentAchievementRepository<TAchievement>
  id: string
}): Promise<void> {
  const perm = input.principal.permissions.includes('achievement:delete_own') ? 'achievement:delete_own' : 'student_profile:edit_own'
  requirePermission(input.principal, perm)
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}
