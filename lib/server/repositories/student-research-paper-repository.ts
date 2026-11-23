import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentResearchPaper } from '@/generated/prisma/client'
import type { StudentResearchPaperInput, StudentResearchPaperRepository } from '../services/student'

export class PrismaStudentResearchPaperRepository implements StudentResearchPaperRepository<StudentResearchPaper> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentResearchPaper[]> {
    return prisma.studentResearchPaper.findMany({
      where: { institutionId: input.institutionId, studentProfile: { userId: input.userId } },
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
        verificationStatus: 'PENDING',
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentResearchPaperInput }): Promise<StudentResearchPaper> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentResearchPaper.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Research paper not found.')

    return prisma.studentResearchPaper.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: {
        ...input.data,
        verificationStatus: 'PENDING', // Reset verification on edit
      },
    })
  }

  async deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentResearchPaper.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Research paper not found.')

    await prisma.studentResearchPaper.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
