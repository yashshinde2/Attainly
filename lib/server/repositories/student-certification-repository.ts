import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentCertification } from '@/generated/prisma/client'
import type { StudentCertificationInput, StudentCertificationRepository } from '../services/student'

export class PrismaStudentCertificationRepository implements StudentCertificationRepository<StudentCertification> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentCertification[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.studentCertification.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentCertificationInput }): Promise<StudentCertification> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentCertification.create({
      data: {
        ...input.data,
        verificationStatus: 'PENDING',
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentCertificationInput }): Promise<StudentCertification> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentCertification.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Certification not found.')

    return prisma.studentCertification.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: {
        ...input.data,
        verificationStatus: 'PENDING', // Reset verification on edit
      },
    })
  }

  async deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentCertification.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Certification not found.')

    await prisma.studentCertification.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
