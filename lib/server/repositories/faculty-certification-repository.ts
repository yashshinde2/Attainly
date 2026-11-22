import 'server-only'
import { prisma } from '@/lib/server/db'
import type { FacultyCertification } from '@/generated/prisma/client'
import type { FacultyCertificationInput, FacultyCertificationRepository } from '../services/faculty'

export class PrismaFacultyCertificationRepository implements FacultyCertificationRepository<FacultyCertification> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<FacultyCertification[]> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.facultyCertification.findMany({
      where: { institutionId: input.institutionId, facultyProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: FacultyCertificationInput }): Promise<FacultyCertification> {
    const profile = await prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.facultyCertification.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        facultyProfileId: profile.id,
      },
    })
  }
}
