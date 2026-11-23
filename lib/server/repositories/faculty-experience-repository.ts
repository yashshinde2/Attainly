import 'server-only'
import { prisma } from '@/lib/server/db'
import type { FacultyExperience } from '@/generated/prisma/client'
import type { FacultyExperienceInput, FacultyExperienceRepository } from '../services/faculty'

export class PrismaFacultyExperienceRepository implements FacultyExperienceRepository<FacultyExperience> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<FacultyExperience[]> {
    return prisma.facultyExperience.findMany({
      where: { institutionId: input.institutionId, facultyProfile: { userId: input.userId } },
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

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: FacultyExperienceInput }): Promise<FacultyExperience> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Faculty profile not found.')

    const existing = await prisma.facultyExperience.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Experience record not found.')

    return prisma.facultyExperience.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: input.data,
    })
  }

  async deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Faculty profile not found.')

    const existing = await prisma.facultyExperience.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Experience record not found.')

    await prisma.facultyExperience.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
