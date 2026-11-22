import 'server-only'
import { prisma } from '@/lib/server/db'
import type { FacultyExperience } from '@/generated/prisma/client'
import type { FacultyExperienceInput, FacultyExperienceRepository } from '../services/faculty'

export class PrismaFacultyExperienceRepository implements FacultyExperienceRepository<FacultyExperience> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<FacultyExperience[]> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.facultyExperience.findMany({
      where: { institutionId: input.institutionId, facultyProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: FacultyExperienceInput }): Promise<FacultyExperience> {
    const profile = await prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.facultyExperience.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        facultyProfileId: profile.id,
      },
    })
  }
}
