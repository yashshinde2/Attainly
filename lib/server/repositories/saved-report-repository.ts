import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Prisma, SavedReport } from '@/generated/prisma/client'

export interface CreateSavedReportInput {
  institutionId: string
  createdByUserId: string
  name: string
  entityType: string
  filters: Prisma.InputJsonValue
}

export class PrismaSavedReportRepository {
  async listByInstitution(input: { institutionId: string }): Promise<SavedReport[]> {
    return prisma.savedReport.findMany({
      where: { institutionId: input.institutionId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(input: { institutionId: string; id: string }): Promise<SavedReport | null> {
    return prisma.savedReport.findUnique({
      where: {
        institutionId_id: {
          institutionId: input.institutionId,
          id: input.id,
        },
      },
    })
  }

  async create(input: CreateSavedReportInput): Promise<SavedReport> {
    return prisma.savedReport.create({
      data: {
        institutionId: input.institutionId,
        createdByUserId: input.createdByUserId,
        name: input.name,
        entityType: input.entityType,
        filters: input.filters,
      },
    })
  }

  async deleteById(input: { institutionId: string; id: string }): Promise<void> {
    const existing = await this.findById({
      institutionId: input.institutionId,
      id: input.id,
    })
    if (!existing) throw new Error('Saved report not found.')

    await prisma.savedReport.delete({
      where: {
        institutionId_id: {
          institutionId: input.institutionId,
          id: input.id,
        },
      },
    })
  }
}
