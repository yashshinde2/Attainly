import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentProject } from '@/generated/prisma/client'
import type { StudentProjectInput, StudentProjectRepository } from '../services/student'

export class PrismaStudentProjectRepository implements StudentProjectRepository<StudentProject> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentProject[]> {
    return prisma.studentProject.findMany({
      where: { institutionId: input.institutionId, studentProfile: { userId: input.userId } },
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

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentProjectInput }): Promise<StudentProject> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentProject.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Project not found.')

    return prisma.studentProject.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: input.data,
    })
  }

  async deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentProject.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Project not found.')

    await prisma.studentProject.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
