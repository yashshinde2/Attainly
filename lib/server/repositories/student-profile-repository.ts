import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Prisma } from '@/generated/prisma/client'
import type { StudentProfileInput, StudentProfileRepository } from '../services/student'

export type StudentProfileWithDetails = Prisma.StudentProfileGetPayload<{
  include: {
    department: true
    course: true
  }
}>

export class PrismaStudentProfileRepository implements StudentProfileRepository<StudentProfileWithDetails> {
  async findByUser(input: { institutionId: string; userId: string }): Promise<StudentProfileWithDetails | null> {
    return prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
      include: {
        department: true,
        course: true,
      },
    })
  }

  async upsertByUser(input: { institutionId: string; userId: string; data: StudentProfileInput }): Promise<StudentProfileWithDetails> {
    return prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId, ...input.data },
      update: input.data,
      include: {
        department: true,
        course: true,
      },
    })
  }
}
