import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Prisma } from '@/generated/prisma/client'
import type { FacultyProfileInput, FacultyProfileRepository } from '../services/faculty'

export type FacultyProfileWithDetails = Prisma.FacultyProfileGetPayload<{
  include: { department: true }
}>

export class PrismaFacultyProfileRepository implements FacultyProfileRepository<FacultyProfileWithDetails> {
  async findByUser(input: { institutionId: string; userId: string }): Promise<FacultyProfileWithDetails | null> {
    return prisma.facultyProfile.findUnique({
      where: { institutionId_userId: input },
      include: { department: true },
    })
  }

  async upsertByUser(input: { institutionId: string; userId: string; data: FacultyProfileInput }): Promise<FacultyProfileWithDetails> {
    return prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId, ...input.data },
      update: input.data,
      include: { department: true },
    })
  }
}
