import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Achievement } from '@/generated/prisma/client'
import type { StudentAchievementInput, StudentAchievementRepository } from '../services/student-achievements'

export class PrismaStudentAchievementRepository implements StudentAchievementRepository<Achievement> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<Achievement[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.achievement.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentAchievementInput }): Promise<Achievement> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.achievement.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }
}
