import 'server-only'
import { prisma } from '@/lib/server/db'
import type { FacultyPatent } from '@/generated/prisma/client'
import type { FacultyPatentInput, FacultyPatentRepository } from '../services/faculty'

export class PrismaFacultyPatentRepository implements FacultyPatentRepository<FacultyPatent> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<FacultyPatent[]> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.facultyPatent.findMany({
      where: { institutionId: input.institutionId, facultyProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: FacultyPatentInput }): Promise<FacultyPatent> {
    const profile = await prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.facultyPatent.create({
      data: {
        ...input.data,
        verificationStatus: 'PENDING',
        institutionId: input.institutionId,
        facultyProfileId: profile.id,
      },
    })
  }

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: FacultyPatentInput }): Promise<FacultyPatent> {
    const profile = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Faculty profile not found.')

    const existing = await prisma.facultyPatent.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Patent not found.')

    return prisma.facultyPatent.update({
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

    const existing = await prisma.facultyPatent.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId: profile.id },
    })
    if (!existing) throw new Error('Patent not found.')

    await prisma.facultyPatent.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
