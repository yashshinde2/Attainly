import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentSemesterRecord } from '@/generated/prisma/client'
import type { StudentSemesterInput, StudentSemesterRepository } from '../services/student'

export class PrismaStudentSemesterRepository implements StudentSemesterRepository<StudentSemesterRecord> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentSemesterRecord[]> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      select: { id: true },
    })
    if (!profile) return []

    return prisma.studentSemesterRecord.findMany({
      where: { institutionId: input.institutionId, studentProfileId: profile.id },
      orderBy: { semesterNumber: 'asc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentSemesterInput }): Promise<StudentSemesterRecord> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentSemesterRecord.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentSemesterInput }): Promise<StudentSemesterRecord> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentSemesterRecord.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Semester record not found.')

    return prisma.studentSemesterRecord.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: input.data,
    })
  }

  async deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentSemesterRecord.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Semester record not found.')

    await prisma.studentSemesterRecord.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
