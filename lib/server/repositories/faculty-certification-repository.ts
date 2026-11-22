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
        verificationStatus: 'PENDING',
        institutionId: input.institutionId,
        facultyProfileId: profile.id,
      },
    })
  }

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: FacultyCertificationInput }): Promise<FacultyCertification> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Faculty profile not found.')

    const existing = await prisma.facultyCertification.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Certification not found.')

    return prisma.facultyCertification.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: {
        ...input.data,
        verificationStatus: 'PENDING', // Reset verification on edit
      },
    })
  }

  async deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Faculty profile not found.')

    const existing = await prisma.facultyCertification.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Certification not found.')

    await prisma.facultyCertification.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
