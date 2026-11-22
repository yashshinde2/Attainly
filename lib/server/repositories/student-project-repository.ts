import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentProject } from '@/generated/prisma/client'
import type { StudentProjectInput, StudentProjectRepository } from '../services/student'

export class PrismaStudentProjectRepository implements StudentProjectRepository<StudentProject> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentProject[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.studentProject.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentProjectInput }): Promise<StudentProject> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentProject.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }
}
