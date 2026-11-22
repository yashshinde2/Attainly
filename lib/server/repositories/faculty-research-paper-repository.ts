import 'server-only'
import { prisma } from '@/lib/server/db'
import type { FacultyResearchPaper } from '@/generated/prisma/client'
import type { FacultyResearchPaperInput, FacultyResearchPaperRepository } from '../services/faculty'

export class PrismaFacultyResearchPaperRepository implements FacultyResearchPaperRepository<FacultyResearchPaper> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<FacultyResearchPaper[]> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.facultyResearchPaper.findMany({
      where: { institutionId: input.institutionId, facultyProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: FacultyResearchPaperInput }): Promise<FacultyResearchPaper> {
    const profile = await prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.facultyResearchPaper.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        facultyProfileId: profile.id,
      },
    })
  }
}
