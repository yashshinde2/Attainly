import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

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
  return input.repository.createByUser({ institutionId: input.principal.institutionId, userId: input.principal.userId, data })
}
