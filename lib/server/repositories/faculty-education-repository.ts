import 'server-only'
import { prisma } from '@/lib/server/db'
import type { FacultyEducation } from '@/generated/prisma/client'
import type { FacultyEducationInput, FacultyEducationRepository } from '../services/faculty'

export class PrismaFacultyEducationRepository implements FacultyEducationRepository<FacultyEducation> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<FacultyEducation[]> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.facultyEducation.findMany({
      where: { institutionId: input.institutionId, facultyProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: FacultyEducationInput }): Promise<FacultyEducation> {
    const profile = await prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.facultyEducation.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        facultyProfileId: profile.id,
      },
    })
  }
}
