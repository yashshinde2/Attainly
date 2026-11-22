import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { prisma } from '@/lib/server/db'

const achievementInput = z.object({
  title: z.string().trim().min(1).max(180),
  category: z.enum(['TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL']),
  status: z.enum(['PARTICIPATION', 'WINNER']),
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

export async function listOwnAchievements<TAchievement>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentAchievementRepository<TAchievement>
}): Promise<TAchievement[]> {
  requirePermission(input.principal, 'achievement:read_own')
  return input.repository.listByUser({ institutionId: input.principal.institutionId, userId: input.principal.userId })
}

export async function addOwnAchievement<TAchievement>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentAchievementRepository<TAchievement>
  data: unknown
}): Promise<TAchievement> {
  requirePermission(input.principal, 'achievement:create_own')
  const data = achievementInput.parse(input.data)

  // Duplicate check: same student, same title and category
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
