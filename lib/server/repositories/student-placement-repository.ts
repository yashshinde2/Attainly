import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentGraduateOutcome, StudentPlacementOffer } from '@/generated/prisma/client'
import type { GraduateOutcomeInput, PlacementOfferInput } from '../services/student-career'

export class PrismaStudentCareerRepository {
  async listPlacementOffersByUser(input: {
    institutionId: string
    userId: string
  }): Promise<StudentPlacementOffer[]> {
    return prisma.studentPlacementOffer.findMany({
      where: { institutionId: input.institutionId, studentProfile: { userId: input.userId } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createPlacementOfferByUser(input: {
    institutionId: string
    userId: string
    data: PlacementOfferInput
  }): Promise<StudentPlacementOffer> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentPlacementOffer.create({
      data: {
        ...input.data,
        verificationStatus: 'PENDING',
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }

  async updatePlacementOfferByUser(input: {
    institutionId: string
    userId: string
    id: string
    data: PlacementOfferInput
  }): Promise<StudentPlacementOffer> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentPlacementOffer.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Placement offer not found.')

    return prisma.studentPlacementOffer.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: {
        ...input.data,
        verificationStatus: 'PENDING',
        verifiedByUserId: null,
        verifiedAt: null,
        rejectionReason: null,
        version: { increment: 1 },
      },
    })
  }

  async deletePlacementOfferByUser(input: {
    institutionId: string
    userId: string
    id: string
  }): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentPlacementOffer.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Placement offer not found.')

    await prisma.studentPlacementOffer.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }

  async getGraduateOutcomeByUser(input: {
    institutionId: string
    userId: string
  }): Promise<StudentGraduateOutcome | null> {
    return prisma.studentGraduateOutcome.findFirst({
      where: { institutionId: input.institutionId, studentProfile: { userId: input.userId } },
    })
  }

  async upsertGraduateOutcomeByUser(input: {
    institutionId: string
    userId: string
    data: GraduateOutcomeInput
  }): Promise<StudentGraduateOutcome> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentGraduateOutcome.upsert({
      where: {
        institutionId_studentProfileId: {
          institutionId: input.institutionId,
          studentProfileId: profile.id,
        },
      },
      create: {
        institutionId: input.institutionId,
        studentProfileId: profile.id,
        ...input.data,
        verificationStatus: 'PENDING',
      },
      update: {
        ...input.data,
        verificationStatus: 'PENDING',
        verifiedByUserId: null,
        verifiedAt: null,
        rejectionReason: null,
        version: { increment: 1 },
      },
    })
  }
}
