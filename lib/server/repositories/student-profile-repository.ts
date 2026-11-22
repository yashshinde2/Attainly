import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentProfile } from '@/generated/prisma/client'
import type { StudentProfileInput, StudentProfileRepository } from '../services/student'

export class PrismaStudentProfileRepository implements StudentProfileRepository<StudentProfile> {
  async findByUser(input: { institutionId: string; userId: string }): Promise<StudentProfile | null> {
    return prisma.studentProfile.findUnique({
      where: { institutionId_userId: input },
    })
  }

  async upsertByUser(input: { institutionId: string; userId: string; data: StudentProfileInput }): Promise<StudentProfile> {
    return prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId, ...input.data },
      update: input.data,
    })
  }
}
