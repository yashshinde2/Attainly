import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

export interface CriterionReferenceItem {
  code: string
  label: string
  isCustom?: boolean
}

export const DEFAULT_ACCREDITATION_CRITERIA: CriterionReferenceItem[] = [
  { code: 'NAAC-1.3.2', label: 'NAAC 1.3.2: Value-Added Courses & Experiential Learning' },
  { code: 'NAAC-3.4.3', label: 'NAAC 3.4.3: Research Publications in UGC/Scopus Journals' },
  { code: 'NAAC-3.4.4', label: 'NAAC 3.4.4: Patents Published and Awarded' },
  { code: 'NAAC-5.2.1', label: 'NAAC 5.2.1: Placement & Internships of Students' },
  { code: 'NAAC-5.3.1', label: 'NAAC 5.3.1: Awards / Medals in Sports & Cultural Activities' },
  { code: 'NBA-PO-PSO', label: 'NBA PO/PSO: Program Outcomes & Attainment' },
]

export interface InstitutionSettingsData {
  institution: {
    id: string
    name: string
    slug: string
  }
  logoUrl: string | null
  criteria: CriterionReferenceItem[]
}

const updateSettingsSchema = z.object({
  name: z.string().trim().min(1).max(180),
  logoUrl: z.string().trim().max(2000).nullable().optional(),
})

const addCriterionSchema = z.object({
  code: z.string().trim().min(2).max(40).toUpperCase(),
  label: z.string().trim().min(2).max(200),
})

export async function getInstitutionBranding(
  principal: AuthenticatedPrincipal,
): Promise<{ name: string; logoUrl: string | null }> {
  const { institutionId } = principal
  const [institution, logoTag] = await Promise.all([
    prisma.institution.findUnique({
      where: { id: institutionId },
      select: { name: true },
    }),
    prisma.criterionTag.findFirst({
      where: { institutionId, itemType: 'INSTITUTION_SETTING', itemId: 'LOGO_URL' },
      select: { criterionCode: true },
    }),
  ])
  return {
    name: institution?.name ?? 'Attainly Institution',
    logoUrl: logoTag?.criterionCode ?? null,
  }
}

export async function getInstitutionSettings(input: {
  principal: AuthenticatedPrincipal
}): Promise<InstitutionSettingsData> {
  requirePermission(input.principal, 'institution:manage')
  const { institutionId } = input.principal

  const [institution, logoTag, customCriterionTags] = await Promise.all([
    prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, name: true, slug: true },
    }),
    prisma.criterionTag.findFirst({
      where: { institutionId, itemType: 'INSTITUTION_SETTING', itemId: 'LOGO_URL' },
      select: { criterionCode: true },
    }),
    prisma.criterionTag.findMany({
      where: { institutionId, itemType: 'REFERENCE_CODE' },
      select: { itemId: true, criterionCode: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!institution) throw new Error('Institution not found.')

  const customCriteria: CriterionReferenceItem[] = customCriterionTags.map((tag) => {
    const parts = tag.criterionCode.split(':::')
    return {
      code: tag.itemId,
      label: parts.length > 1 ? parts.slice(1).join(':::') : tag.criterionCode,
      isCustom: true,
    }
  })

  // Merge default + custom
  const existingCodes = new Set(customCriteria.map((c) => c.code))
  const criteria = [
    ...DEFAULT_ACCREDITATION_CRITERIA.filter((c) => !existingCodes.has(c.code)),
    ...customCriteria,
  ]

  return {
    institution,
    logoUrl: logoTag?.criterionCode ?? null,
    criteria,
  }
}

export async function updateInstitutionSettings(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<void> {
  requirePermission(input.principal, 'institution:manage')
  const { institutionId } = input.principal
  const parsed = updateSettingsSchema.parse(input.data)

  await prisma.institution.update({
    where: { id: institutionId },
    data: { name: parsed.name },
  })

  if (parsed.logoUrl !== undefined) {
    const existing = await prisma.criterionTag.findFirst({
      where: { institutionId, itemType: 'INSTITUTION_SETTING', itemId: 'LOGO_URL' },
    })

    if (parsed.logoUrl) {
      if (existing) {
        await prisma.criterionTag.update({
          where: { institutionId_id: { institutionId, id: existing.id } },
          data: { criterionCode: parsed.logoUrl },
        })
      } else {
        await prisma.criterionTag.create({
          data: {
            institutionId,
            itemType: 'INSTITUTION_SETTING',
            itemId: 'LOGO_URL',
            criterionCode: parsed.logoUrl,
          },
        })
      }
    } else if (existing) {
      await prisma.criterionTag.delete({
        where: { institutionId_id: { institutionId, id: existing.id } },
      })
    }
  }
}

export async function addCriterionReferenceCode(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<CriterionReferenceItem> {
  requirePermission(input.principal, 'institution:manage')
  const { institutionId } = input.principal
  const parsed = addCriterionSchema.parse(input.data)

  // Check if code already exists in default or custom
  const isDefault = DEFAULT_ACCREDITATION_CRITERIA.some((c) => c.code.toUpperCase() === parsed.code)
  if (isDefault) {
    throw new Error(`Criterion code "${parsed.code}" is already defined as a standard criterion.`)
  }

  const existing = await prisma.criterionTag.findFirst({
    where: { institutionId, itemType: 'REFERENCE_CODE', itemId: parsed.code },
  })
  if (existing) {
    throw new Error(`Criterion code "${parsed.code}" already exists.`)
  }

  await prisma.criterionTag.create({
    data: {
      institutionId,
      itemType: 'REFERENCE_CODE',
      itemId: parsed.code,
      criterionCode: `${parsed.code}:::${parsed.label}`,
    },
  })

  return {
    code: parsed.code,
    label: parsed.label,
    isCustom: true,
  }
}
