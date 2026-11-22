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

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: FacultyEducationInput }): Promise<FacultyEducation> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Faculty profile not found.')

    const existing = await prisma.facultyEducation.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Education record not found.')

    return prisma.facultyEducation.update({
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

    const existing = await prisma.facultyEducation.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Education record not found.')

    await prisma.facultyEducation.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
