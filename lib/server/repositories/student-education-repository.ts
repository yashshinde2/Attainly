import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentEducation } from '@/generated/prisma/client'
import type { StudentEducationInput, StudentEducationRepository } from '../services/student'

export class PrismaStudentEducationRepository implements StudentEducationRepository<StudentEducation> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentEducation[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.studentEducation.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentEducationInput }): Promise<StudentEducation> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentEducation.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }
}
