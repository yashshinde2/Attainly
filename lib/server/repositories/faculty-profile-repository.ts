import 'server-only'
import { prisma } from '@/lib/server/db'
import type { FacultyProfile } from '@/generated/prisma/client'
import type { FacultyProfileInput, FacultyProfileRepository } from '../services/faculty'

export class PrismaFacultyProfileRepository implements FacultyProfileRepository<FacultyProfile> {
  async findByUser(input: { institutionId: string; userId: string }): Promise<FacultyProfile | null> {
    return prisma.facultyProfile.findUnique({
      where: { institutionId_userId: input },
    })
  }

  async upsertByUser(input: { institutionId: string; userId: string; data: FacultyProfileInput }): Promise<FacultyProfile> {
    return prisma.facultyProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId, ...input.data },
      update: input.data,
    })
  }
}
