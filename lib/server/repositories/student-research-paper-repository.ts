import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentResearchPaper } from '@/generated/prisma/client'
import type { StudentResearchPaperInput, StudentResearchPaperRepository } from '../services/student'

export class PrismaStudentResearchPaperRepository implements StudentResearchPaperRepository<StudentResearchPaper> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentResearchPaper[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.studentResearchPaper.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentResearchPaperInput }): Promise<StudentResearchPaper> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentResearchPaper.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }
}
