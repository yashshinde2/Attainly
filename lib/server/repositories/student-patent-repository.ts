import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentPatent } from '@/generated/prisma/client'
import type { StudentPatentInput, StudentPatentRepository } from '../services/student'

export class PrismaStudentPatentRepository implements StudentPatentRepository<StudentPatent> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentPatent[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.studentPatent.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentPatentInput }): Promise<StudentPatent> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentPatent.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }
}
