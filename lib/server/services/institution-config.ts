import 'server-only'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/server/db'
import {
  AuthorizationError,
  requirePermission,
  type AuthenticatedPrincipal,
} from '@/lib/server/authorization'

export const DEFAULT_INSTITUTION_CONFIG = {
  academicYearStartMonth: 7,
  gradingScaleType: 'CGPA_10',
  gradingScaleMax: 10,
  studentIdLabel: 'Enrollment Number',
  facultyIdLabel: 'Employee ID',
  facultyDesignations: [
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Lecturer',
    'Visiting Faculty',
  ],
  employmentCategories: ['Regular', 'Contract', 'Ad-hoc', 'Visiting'],
  allowedDocumentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  requireEvidenceForClaims: false,
  mandatoryStudentFields: ['phone', 'dateOfBirth', 'address'],
  mandatoryFacultyFields: ['phone', 'designation', 'specialization'],
  reportHeaderTitle: null as string | null,
  reportHeaderSubtitle: null as string | null,
  brandPrimaryColor: null as string | null,
  inspectionTemplatesJson: [] as Array<{
    name: string
    framework: string
    reportIds: string[]
  }>,
}

const configUpdateSchema = z.object({
  academicYearStartMonth: z.coerce.number().int().min(1).max(12),
  gradingScaleType: z.enum(['CGPA_10', 'CGPA_4', 'PERCENTAGE_100']),
  gradingScaleMax: z.coerce.number().positive().max(100),
  studentIdLabel: z.string().trim().min(2).max(60),
  facultyIdLabel: z.string().trim().min(2).max(60),
  facultyDesignations: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
  employmentCategories: z.array(z.string().trim().min(1).max(60)).min(1).max(20),
  allowedDocumentTypes: z
    .array(z.enum(['application/pdf', 'image/jpeg', 'image/png']))
    .min(1),
  requireEvidenceForClaims: z.boolean(),
  mandatoryStudentFields: z.array(z.string().trim().min(1).max(60)).max(20),
  mandatoryFacultyFields: z.array(z.string().trim().min(1).max(60)).max(20),
  reportHeaderTitle: z.string().trim().max(160).nullable().optional(),
  reportHeaderSubtitle: z.string().trim().max(240).nullable().optional(),
  brandPrimaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Brand color must be a 6-digit hex color (e.g. #1D4ED8).')
    .nullable()
    .optional(),
  inspectionTemplatesJson: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(120),
        framework: z.string().trim().min(2).max(40),
        reportIds: z.array(z.string().trim().min(1)).max(20),
      }),
    )
    .max(25)
    .optional(),
})

const customFieldSchema = z.object({
  fieldKey: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,48}$/, 'Field key must be lowercase snake_case (2-49 chars).'),
  displayName: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).nullable().optional(),
  dataType: z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT']),
  profileType: z.enum(['STUDENT', 'FACULTY']),
  isRequired: z.boolean().default(false),
  allowedValues: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  validationRegex: z.string().trim().max(120).nullable().optional(),
  visibilityScope: z.enum(['SELF_AND_ADMIN', 'ADMIN_ONLY']).default('SELF_AND_ADMIN'),
  reportEligible: z.boolean().default(false),
})

export function validateSafeRegexPattern(pattern: string | null | undefined): string | null {
  const trimmed = pattern?.trim()
  if (!trimmed) return null
  if (trimmed.length > 120) {
    throw new Error('Validation regex cannot exceed 120 characters.')
  }
  try {
    // Validate compilation; never use eval or Function
    new RegExp(trimmed)
  } catch {
    throw new Error('Invalid validation regular expression.')
  }
  return trimmed
}

export function validateCustomFieldValue(
  def: {
    displayName: string
    dataType: string
    isRequired: boolean
    allowedValues: string[]
    validationRegex: string | null
  },
  raw: string | null | undefined,
): string | null {
  const val = (raw ?? '').trim()
  if (!val) {
    if (def.isRequired) {
      throw new Error(`${def.displayName} is required.`)
    }
    return null
  }

  switch (def.dataType) {
    case 'NUMBER': {
      const n = Number(val)
      if (!Number.isFinite(n)) {
        throw new Error(`${def.displayName} must be a valid number.`)
      }
      break
    }
    case 'DATE': {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val)
      if (!m) throw new Error(`${def.displayName} must use YYYY-MM-DD format.`)
      const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
      if (
        dt.getUTCFullYear() !== Number(m[1]) ||
        dt.getUTCMonth() !== Number(m[2]) - 1 ||
        dt.getUTCDate() !== Number(m[3])
      ) {
        throw new Error(`${def.displayName} is not a valid calendar date.`)
      }
      break
    }
    case 'BOOLEAN': {
      if (val !== 'true' && val !== 'false') {
        throw new Error(`${def.displayName} must be true or false.`)
      }
      break
    }
    case 'SELECT': {
      if (!def.allowedValues.includes(val)) {
        throw new Error(`${def.displayName} must be one of: ${def.allowedValues.join(', ')}.`)
      }
      break
    }
    default:
      break
  }

  if (def.validationRegex) {
    const re = new RegExp(def.validationRegex)
    if (!re.test(val)) {
      throw new Error(`${def.displayName} does not match the required format.`)
    }
  }

  return val
}

export async function getInstitutionConfigOrDefault(institutionId: string) {
  const existing = await prisma.institutionConfig.findUnique({
    where: { institutionId },
  })
  if (!existing) {
    return { institutionId, ...DEFAULT_INSTITUTION_CONFIG }
  }
  return existing
}

export async function getInstitutionConfigWorkspace(principal: AuthenticatedPrincipal) {
  requirePermission(principal, 'institution:manage')
  const { institutionId } = principal
  const [config, customFields, activityCategories, eventCategories] = await Promise.all([
    getInstitutionConfigOrDefault(institutionId),
    prisma.customFieldDefinition.findMany({
      where: { institutionId },
      orderBy: [{ profileType: 'asc' }, { isActive: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.achievementCategoryConfig.findMany({
      where: { institutionId },
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.eventCategoryConfig.findMany({
      where: { institutionId },
      orderBy: { code: 'asc' },
    }),
  ])

  return { config, customFields, activityCategories, eventCategories }
}

export async function updateInstitutionConfig(
  principal: AuthenticatedPrincipal,
  raw: unknown,
) {
  requirePermission(principal, 'institution:manage')
  const parsed = configUpdateSchema.parse(raw)
  const { institutionId } = principal

  return prisma.institutionConfig.upsert({
    where: { institutionId },
    create: {
      institutionId,
      ...parsed,
      reportHeaderTitle: parsed.reportHeaderTitle ?? null,
      reportHeaderSubtitle: parsed.reportHeaderSubtitle ?? null,
      brandPrimaryColor: parsed.brandPrimaryColor ?? null,
      inspectionTemplatesJson: (parsed.inspectionTemplatesJson ?? []) as Prisma.InputJsonValue,
    },
    update: {
      ...parsed,
      reportHeaderTitle: parsed.reportHeaderTitle ?? null,
      reportHeaderSubtitle: parsed.reportHeaderSubtitle ?? null,
      brandPrimaryColor: parsed.brandPrimaryColor ?? null,
      inspectionTemplatesJson: (parsed.inspectionTemplatesJson ?? []) as Prisma.InputJsonValue,
    },
  })
}

export async function upsertActivityCategory(
  principal: AuthenticatedPrincipal,
  input: { code: string; name: string; subcategories: string[]; isActive?: boolean },
) {
  requirePermission(principal, 'institution:manage')
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  if (code.length < 2) throw new Error('Category code must be at least 2 characters.')

  return prisma.achievementCategoryConfig.upsert({
    where: { institutionId_code: { institutionId: principal.institutionId, code } },
    create: {
      institutionId: principal.institutionId,
      code,
      name: input.name.trim(),
      subcategories: input.subcategories.map((s) => s.trim()).filter(Boolean),
      isActive: input.isActive ?? true,
    },
    update: {
      name: input.name.trim(),
      subcategories: input.subcategories.map((s) => s.trim()).filter(Boolean),
      isActive: input.isActive ?? true,
    },
  })
}

export async function createCustomFieldDefinition(
  principal: AuthenticatedPrincipal,
  raw: unknown,
) {
  requirePermission(principal, 'institution:manage')
  const parsed = customFieldSchema.parse(raw)
  const safeRegex = validateSafeRegexPattern(parsed.validationRegex)
  if (parsed.dataType === 'SELECT' && parsed.allowedValues.length === 0) {
    throw new Error('SELECT custom fields require at least one allowed value.')
  }

  return prisma.customFieldDefinition.create({
    data: {
      institutionId: principal.institutionId,
      fieldKey: parsed.fieldKey,
      displayName: parsed.displayName,
      description: parsed.description ?? null,
      dataType: parsed.dataType,
      profileType: parsed.profileType,
      isRequired: parsed.isRequired,
      allowedValues: parsed.allowedValues,
      validationRegex: safeRegex,
      visibilityScope: parsed.visibilityScope,
      reportEligible: parsed.reportEligible,
      isActive: true,
      version: 1,
    },
  })
}

export async function setCustomFieldActive(
  principal: AuthenticatedPrincipal,
  fieldId: string,
  isActive: boolean,
) {
  requirePermission(principal, 'institution:manage')
  return prisma.customFieldDefinition.update({
    where: { institutionId_id: { institutionId: principal.institutionId, id: fieldId } },
    data: { isActive, version: { increment: 1 } },
  })
}

export async function getProfileCustomFields(
  principal: AuthenticatedPrincipal,
  input: {
    profileType: 'STUDENT' | 'FACULTY'
    profileId: string
  },
) {
  const isAdmin =
    principal.permissions.includes('user:manage') ||
    principal.permissions.includes('institution:manage')

  const [defs, vals] = await Promise.all([
    prisma.customFieldDefinition.findMany({
      where: {
        institutionId: principal.institutionId,
        profileType: input.profileType,
        isActive: true,
        ...(isAdmin ? {} : { visibilityScope: 'SELF_AND_ADMIN' }),
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customFieldValue.findMany({
      where: {
        institutionId: principal.institutionId,
        profileType: input.profileType,
        profileId: input.profileId,
      },
    }),
  ])

  const valMap = new Map(vals.map((v) => [v.fieldKey, v]))
  return defs.map((d) => ({
    id: d.id,
    fieldKey: d.fieldKey,
    displayName: d.displayName,
    description: d.description,
    dataType: d.dataType,
    isRequired: d.isRequired,
    allowedValues: d.allowedValues,
    visibilityScope: d.visibilityScope,
    reportEligible: d.reportEligible,
    version: d.version,
    value: valMap.get(d.fieldKey)?.valueText ?? '',
    savedDefinitionVersion: valMap.get(d.fieldKey)?.definitionVersion ?? null,
  }))
}

export async function saveProfileCustomFields(
  principal: AuthenticatedPrincipal,
  input: {
    profileType: 'STUDENT' | 'FACULTY'
    profileId: string
    values: Record<string, string>
  },
) {
  const { institutionId, userId } = principal
  const isAdmin =
    principal.permissions.includes('user:manage') ||
    principal.permissions.includes('institution:manage')

  if (!isAdmin) {
    if (input.profileType === 'STUDENT') {
      const own = await prisma.studentProfile.findUnique({
        where: { institutionId_userId: { institutionId, userId } },
        select: { id: true },
      })
      if (!own || own.id !== input.profileId) {
        throw new AuthorizationError('You can only update custom fields on your own profile.')
      }
    } else {
      const own = await prisma.facultyProfile.findUnique({
        where: { institutionId_userId: { institutionId, userId } },
        select: { id: true },
      })
      if (!own || own.id !== input.profileId) {
        throw new AuthorizationError('You can only update custom fields on your own profile.')
      }
    }
  }

  const activeDefs = await prisma.customFieldDefinition.findMany({
    where: {
      institutionId,
      profileType: input.profileType,
      isActive: true,
    },
  })

  for (const def of activeDefs) {
    if (!isAdmin && def.visibilityScope === 'ADMIN_ONLY') {
      if (def.fieldKey in input.values) {
        throw new AuthorizationError(`Field "${def.displayName}" is restricted to administrators.`)
      }
      continue
    }
    const cleanVal = validateCustomFieldValue(def, input.values[def.fieldKey])
    await prisma.customFieldValue.upsert({
      where: {
        institutionId_profileType_profileId_fieldKey: {
          institutionId,
          profileType: input.profileType,
          profileId: input.profileId,
          fieldKey: def.fieldKey,
        },
      },
      create: {
        institutionId,
        definitionId: def.id,
        definitionVersion: def.version,
        fieldKey: def.fieldKey,
        profileType: input.profileType,
        profileId: input.profileId,
        valueText: cleanVal,
        updatedByUserId: userId,
      },
      update: {
        definitionId: def.id,
        definitionVersion: def.version,
        valueText: cleanVal,
        updatedByUserId: userId,
      },
    })
  }

  return { saved: true }
}
