import 'server-only'
import { prisma } from '@/lib/server/db'
import type { StudentSkill } from '@/generated/prisma/client'
import type { StudentSkillInput, StudentSkillRepository } from '../services/student'

export class PrismaStudentSkillRepository implements StudentSkillRepository<StudentSkill> {
  async listByUser(input: { institutionId: string; userId: string }): Promise<StudentSkill[]> {
    return prisma.studentSkill.findMany({
      where: { institutionId: input.institutionId, studentProfile: { userId: input.userId } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createByUser(input: { institutionId: string; userId: string; data: StudentSkillInput }): Promise<StudentSkill> {
    const profile = await prisma.studentProfile.upsert({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      create: { institutionId: input.institutionId, userId: input.userId },
      update: {},
      select: { id: true },
    })

    return prisma.studentSkill.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        studentProfileId: profile.id,
      },
    })
  }

  async updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentSkillInput }): Promise<StudentSkill> {
    const profile = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
      select: { id: true },
    })
    if (!profile) throw new Error('Student profile not found.')

    const existing = await prisma.studentSkill.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Skill not found.')

    return prisma.studentSkill.update({
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

    const existing = await prisma.studentSkill.findFirst({
      where: { id: input.id, institutionId: input.institutionId, studentProfileId: profile.id },
    })
    if (!existing) throw new Error('Skill not found.')

    await prisma.studentSkill.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
