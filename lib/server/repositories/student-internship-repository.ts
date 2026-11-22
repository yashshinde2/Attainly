import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentInternship } from '@/generated/prisma/client'
import type { StudentInternshipInput, StudentInternshipRepository } from '../services/student'

export class PrismaStudentInternshipRepository implements StudentInternshipRepository<StudentInternship> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentInternship[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.studentInternship.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentInternshipInput }): Promise<StudentInternship> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentInternship.create({
      data: {
        ...input.data,
        verificationStatus: 'PENDING',
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentInternshipInput }): Promise<StudentInternship> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentInternship.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Internship not found.')

    return prisma.studentInternship.update({
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

    const existing = await prisma.studentInternship.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Internship not found.')

    await prisma.studentInternship.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
