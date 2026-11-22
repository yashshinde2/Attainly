import 'server-only'
import { prisma } from '@/lib/server/db'
import type { CriterionTag } from '@/generated/prisma/client'

export interface CriterionTagInput {
  itemType: string
  itemId: string
  criterionCode: string
}

export class PrismaCriterionTagRepository {
  async listByItem(input: { institutionId: string; itemType: string; itemId: string }): Promise<CriterionTag[]> {
    return prisma.criterionTag.findMany({
      where: {
        institutionId: input.institutionId,
        itemType: input.itemType,
        itemId: input.itemId,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async setTagForItem(input: {
    institutionId: string
    itemType: string
    itemId: string
    criterionCode: string
  }): Promise<CriterionTag> {
    const existing = await prisma.criterionTag.findFirst({
      where: {
        institutionId: input.institutionId,
        itemType: input.itemType,
        itemId: input.itemId,
      },
    })

    if (existing) {
      return prisma.criterionTag.update({
        where: { institutionId_id: { institutionId: input.institutionId, id: existing.id } },
        data: { criterionCode: input.criterionCode },
      })
    }

    return prisma.criterionTag.create({
      data: {
        institutionId: input.institutionId,
        itemType: input.itemType,
        itemId: input.itemId,
        criterionCode: input.criterionCode,
      },
    })
  }

  async removeTagForItem(input: { institutionId: string; itemType: string; itemId: string }): Promise<void> {
    const existing = await prisma.criterionTag.findFirst({
      where: {
        institutionId: input.institutionId,
        itemType: input.itemType,
        itemId: input.itemId,
      },
    })
    if (existing) {
      await prisma.criterionTag.delete({
        where: { institutionId_id: { institutionId: input.institutionId, id: existing.id } },
      })
    }
  }
}
