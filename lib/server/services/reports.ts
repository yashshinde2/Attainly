import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import type { Prisma, SavedReport } from '@/generated/prisma/client'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { calculateFacultyCompleteness, calculateStudentCompleteness } from '@/lib/completeness'
import { DEFAULT_ACCREDITATION_CRITERIA, type CriterionReferenceItem } from './institution'
import { PrismaSavedReportRepository } from '../repositories/saved-report-repository'

export interface DateRangeFilter {
  from?: string | null
  to?: string | null
}

export interface ReportFilterInput {
  departmentId?: string | null
  batchYear?: number | null
  eventType?: string | null
  dateRange?: DateRangeFilter | null
  includeUnverified?: boolean
  threshold?: number
}

export interface AchievementCategoryStatRow {
  category: string
  verificationStatus: string
  count: number
}

export interface EventParticipationStatRow {
  eventType: string
  role: string
  count: number
}

export interface CertResearchPatentStatRow {
  recordType: string
  departmentName: string
  batchYear: string
  verificationStatus: string
  count: number
}

export interface VerificationAgingRow {
  recordType: string
  label: string
  totalPending: number
  olderThan7Days: number
  olderThan14Days: number
  olderThan30Days: number
}

export interface CompletenessLaggardRow {
  userId: string
  name: string
  email: string
  role: 'STUDENT' | 'FACULTY'
  departmentName: string
  completenessPercentage: number
  missingSections: string[]
}

export interface CriterionCoverageRow {
  code: string
  label: string
  verifiedCount: number
  totalTaggedCount: number
  isGap: boolean
}

export interface AdminAttentionInsights {
  pendingOver7DaysCount: number
  departmentsBelow50Count: number
  zeroCoverageCriteriaCount: number
}

function buildDateRangeWhere(dateRange?: DateRangeFilter | null) {
  if (!dateRange?.from && !dateRange?.to) return undefined
  const filter: { gte?: Date; lte?: Date } = {}
  if (dateRange.from) {
    const d = new Date(dateRange.from)
    if (Number.isNaN(d.getTime())) throw new Error('Invalid start date.')
    filter.gte = d
  }
  if (dateRange.to) {
    const d = new Date(dateRange.to)
    if (Number.isNaN(d.getTime())) throw new Error('Invalid end date.')
    d.setHours(23, 59, 59, 999)
    filter.lte = d
  }
  if (filter.gte && filter.lte && filter.gte > filter.lte) {
    throw new Error('Start date cannot be after end date.')
  }
  return Object.keys(filter).length > 0 ? filter : undefined
}

export async function achievementStatsByCategory(input: {
  principal: AuthenticatedPrincipal
  departmentId?: string | null
  batchYear?: number | null
  dateRange?: DateRangeFilter | null
  includeUnverified?: boolean
}): Promise<AchievementCategoryStatRow[]> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal
  const includeUnverified = Boolean(input.includeUnverified)
  const createdAtFilter = buildDateRangeWhere(input.dateRange)

  const studentProfileFilter: Prisma.StudentProfileWhereInput = {}
  if (input.departmentId) studentProfileFilter.departmentId = input.departmentId
  if (input.batchYear) studentProfileFilter.admissionYear = input.batchYear

  const where: Prisma.AchievementWhereInput = {
    institutionId,
    ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    ...(Object.keys(studentProfileFilter).length > 0 ? { studentProfile: studentProfileFilter } : {}),
  }

  const grouped = await prisma.achievement.groupBy({
    by: ['category', 'verificationStatus'],
    where,
    _count: { _all: true },
    orderBy: [{ category: 'asc' }, { verificationStatus: 'asc' }],
  })

  return grouped.map((row) => ({
    category: row.category,
    verificationStatus: row.verificationStatus,
    count: row._count._all,
  }))
}

export async function eventParticipationStats(input: {
  principal: AuthenticatedPrincipal
  eventType?: string | null
  departmentId?: string | null
  dateRange?: DateRangeFilter | null
}): Promise<EventParticipationStatRow[]> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal
  const startsAtFilter = buildDateRangeWhere(input.dateRange)

  const eventWhere: Prisma.EventWhereInput = {
    institutionId,
    ...(input.eventType ? { type: input.eventType } : {}),
    ...(input.departmentId ? { departmentId: input.departmentId } : {}),
    ...(startsAtFilter ? { startsAt: startsAtFilter } : {}),
  }

  const matchingEvents = await prisma.event.findMany({
    where: eventWhere,
    select: { id: true, type: true },
  })

  if (matchingEvents.length === 0) return []

  const eventTypeById = new Map(matchingEvents.map((e) => [e.id, e.type]))
  const grouped = await prisma.eventParticipation.groupBy({
    by: ['eventId', 'role'],
    where: {
      institutionId,
      eventId: { in: matchingEvents.map((e) => e.id) },
    },
    _count: { _all: true },
  })

  const aggregated = new Map<string, EventParticipationStatRow>()
  for (const row of grouped) {
    const eventType = eventTypeById.get(row.eventId) ?? 'OTHER'
    const key = `${eventType}::${row.role}`
    const existing = aggregated.get(key)
    if (existing) {
      existing.count += row._count._all
    } else {
      aggregated.set(key, {
        eventType,
        role: row.role,
        count: row._count._all,
      })
    }
  }

  return Array.from(aggregated.values()).sort((a, b) =>
    a.eventType.localeCompare(b.eventType) || a.role.localeCompare(b.role),
  )
}

export async function certificationResearchPatentStats(input: {
  principal: AuthenticatedPrincipal
  departmentId?: string | null
  batchYear?: number | null
  dateRange?: DateRangeFilter | null
  includeUnverified?: boolean
}): Promise<CertResearchPatentStatRow[]> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal
  const includeUnverified = Boolean(input.includeUnverified)
  const createdAtFilter = buildDateRangeWhere(input.dateRange)

  const studentProfileFilter: Prisma.StudentProfileWhereInput = {}
  if (input.departmentId) studentProfileFilter.departmentId = input.departmentId
  if (input.batchYear) studentProfileFilter.admissionYear = input.batchYear
  const hasStudentFilter = Object.keys(studentProfileFilter).length > 0

  const verificationFilter = includeUnverified ? {} : { verificationStatus: 'VERIFIED' as const }
  const dateFilter = createdAtFilter ? { createdAt: createdAtFilter } : {}
  const studentWhere = {
    institutionId,
    ...verificationFilter,
    ...dateFilter,
    ...(hasStudentFilter ? { studentProfile: studentProfileFilter } : {}),
  }

  const [
    studentProfiles,
    sCerts,
    sPapers,
    sPatents,
    fCerts,
    fPapers,
    fPatents,
  ] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { institutionId, ...studentProfileFilter },
      select: {
        id: true,
        admissionYear: true,
        department: { select: { name: true } },
      },
    }),
    prisma.studentCertification.groupBy({
      by: ['studentProfileId', 'verificationStatus'],
      where: studentWhere,
      _count: { _all: true },
    }),
    prisma.studentResearchPaper.groupBy({
      by: ['studentProfileId', 'verificationStatus'],
      where: studentWhere,
      _count: { _all: true },
    }),
    prisma.studentPatent.groupBy({
      by: ['studentProfileId', 'verificationStatus'],
      where: studentWhere,
      _count: { _all: true },
    }),
    hasStudentFilter
      ? Promise.resolve([])
      : prisma.facultyCertification.groupBy({
          by: ['verificationStatus'],
          where: { institutionId, ...verificationFilter, ...dateFilter },
          _count: { _all: true },
        }),
    hasStudentFilter
      ? Promise.resolve([])
      : prisma.facultyResearchPaper.groupBy({
          by: ['verificationStatus'],
          where: { institutionId, ...verificationFilter, ...dateFilter },
          _count: { _all: true },
        }),
    hasStudentFilter
      ? Promise.resolve([])
      : prisma.facultyPatent.groupBy({
          by: ['verificationStatus'],
          where: { institutionId, ...verificationFilter, ...dateFilter },
          _count: { _all: true },
        }),
  ])

  const profileMeta = new Map(
    studentProfiles.map((p) => [
      p.id,
      {
        departmentName: p.department?.name ?? 'Unassigned',
        batchYear: p.admissionYear ? String(p.admissionYear) : 'Unassigned',
      },
    ]),
  )

  const aggregated = new Map<string, CertResearchPatentStatRow>()
  const addRow = (
    recordType: string,
    departmentName: string,
    batchYear: string,
    verificationStatus: string,
    count: number,
  ) => {
    const key = `${recordType}::${departmentName}::${batchYear}::${verificationStatus}`
    const existing = aggregated.get(key)
    if (existing) {
      existing.count += count
    } else {
      aggregated.set(key, {
        recordType,
        departmentName,
        batchYear,
        verificationStatus,
        count,
      })
    }
  }

  for (const row of sCerts) {
    const meta = profileMeta.get(row.studentProfileId) ?? { departmentName: 'Unassigned', batchYear: 'Unassigned' }
    addRow('Student Certification', meta.departmentName, meta.batchYear, row.verificationStatus, row._count._all)
  }
  for (const row of sPapers) {
    const meta = profileMeta.get(row.studentProfileId) ?? { departmentName: 'Unassigned', batchYear: 'Unassigned' }
    addRow('Student Research Paper', meta.departmentName, meta.batchYear, row.verificationStatus, row._count._all)
  }
  for (const row of sPatents) {
    const meta = profileMeta.get(row.studentProfileId) ?? { departmentName: 'Unassigned', batchYear: 'Unassigned' }
    addRow('Student Patent', meta.departmentName, meta.batchYear, row.verificationStatus, row._count._all)
  }

  for (const row of fCerts) {
    addRow('Faculty Certification', 'Faculty', 'N/A', row.verificationStatus, row._count._all)
  }
  for (const row of fPapers) {
    addRow('Faculty Research Paper', 'Faculty', 'N/A', row.verificationStatus, row._count._all)
  }
  for (const row of fPatents) {
    addRow('Faculty Patent', 'Faculty', 'N/A', row.verificationStatus, row._count._all)
  }

  return Array.from(aggregated.values()).sort((a, b) =>
    a.recordType.localeCompare(b.recordType) ||
    a.departmentName.localeCompare(b.departmentName) ||
    a.batchYear.localeCompare(b.batchYear),
  )
}

export async function verificationQueueAging(input: {
  principal: AuthenticatedPrincipal
}): Promise<VerificationAgingRow[]> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const cutoff7 = now - 7 * dayMs
  const cutoff14 = now - 14 * dayMs
  const cutoff30 = now - 30 * dayMs

  async function summarizePending(
    recordType: string,
    label: string,
    fetcher: () => Promise<Array<{ createdAt: Date }>>,
  ): Promise<VerificationAgingRow> {
    const rows = await fetcher()
    let olderThan7Days = 0
    let olderThan14Days = 0
    let olderThan30Days = 0
    for (const r of rows) {
      const ts = r.createdAt.getTime()
      if (ts < cutoff7) olderThan7Days += 1
      if (ts < cutoff14) olderThan14Days += 1
      if (ts < cutoff30) olderThan30Days += 1
    }
    return {
      recordType,
      label,
      totalPending: rows.length,
      olderThan7Days,
      olderThan14Days,
      olderThan30Days,
    }
  }

  const pendingWhere = { institutionId, verificationStatus: 'PENDING' as const }

  // Run in two small batches of 4 to stay well within Postgres session pool limits
  const batch1 = await Promise.all([
    summarizePending('ACHIEVEMENT', 'Student Achievements', () =>
      prisma.achievement.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
    summarizePending('CERTIFICATION', 'Student Certifications', () =>
      prisma.studentCertification.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
    summarizePending('RESEARCH_PAPER', 'Student Research Papers', () =>
      prisma.studentResearchPaper.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
    summarizePending('PATENT', 'Student Patents', () =>
      prisma.studentPatent.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
  ])

  const batch2 = await Promise.all([
    summarizePending('INTERNSHIP', 'Student Internships', () =>
      prisma.studentInternship.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
    summarizePending('FACULTY_CERTIFICATION', 'Faculty Certifications', () =>
      prisma.facultyCertification.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
    summarizePending('FACULTY_RESEARCH_PAPER', 'Faculty Research Papers', () =>
      prisma.facultyResearchPaper.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
    summarizePending('FACULTY_PATENT', 'Faculty Patents', () =>
      prisma.facultyPatent.findMany({ where: pendingWhere, select: { createdAt: true } }),
    ),
  ])

  return [...batch1, ...batch2]
}

export async function profileCompletenessLaggards(input: {
  principal: AuthenticatedPrincipal
  threshold?: number
  departmentId?: string | null
}): Promise<CompletenessLaggardRow[]> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal
  const threshold = typeof input.threshold === 'number' && !Number.isNaN(input.threshold) ? input.threshold : 60

  const [students, faculty] = await Promise.all([
    prisma.studentProfile.findMany({
      where: {
        institutionId,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      select: {
        enrollmentNumber: true,
        departmentId: true,
        phone: true,
        department: { select: { name: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            _count: { select: { eventEntries: true } },
          },
        },
        _count: {
          select: {
            education: true,
            semesterRecords: true,
            achievements: true,
            certifications: true,
            researchPapers: true,
            patents: true,
            projects: true,
            internships: true,
            skills: true,
          },
        },
      },
    }),
    input.departmentId
      ? Promise.resolve([])
      : prisma.facultyProfile.findMany({
          where: { institutionId },
          select: {
            phone: true,
            office: true,
            linkedinUrl: true,
            researchGateOrOrcidUrl: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                education: true,
                experiences: true,
                certifications: true,
                researchPapers: true,
                patents: true,
              },
            },
          },
        }),
  ])

  const laggards: CompletenessLaggardRow[] = []

  for (const s of students) {
    const result = calculateStudentCompleteness({
      hasPersonalInfo: Boolean(s.enrollmentNumber || s.departmentId || s.phone),
      educationCount: s._count.education,
      semesterCount: s._count.semesterRecords,
      achievementCount: s._count.achievements,
      participationCount: s.user._count.eventEntries,
      certificationCount: s._count.certifications,
      researchPaperCount: s._count.researchPapers,
      patentCount: s._count.patents,
      projectCount: s._count.projects,
      internshipCount: s._count.internships,
      skillCount: s._count.skills,
    })
    if (result.percentage < threshold) {
      laggards.push({
        userId: s.user.id,
        name: `${s.user.firstName} ${s.user.lastName}`.trim(),
        email: s.user.email,
        role: 'STUDENT',
        departmentName: s.department?.name ?? 'Unassigned',
        completenessPercentage: result.percentage,
        missingSections: result.missingSections,
      })
    }
  }

  for (const f of faculty) {
    const result = calculateFacultyCompleteness({
      hasPersonalInfo: Boolean(f.phone || f.office || f.linkedinUrl || f.researchGateOrOrcidUrl),
      educationCount: f._count.education,
      experienceCount: f._count.experiences,
      certificationCount: f._count.certifications,
      researchPaperCount: f._count.researchPapers,
      patentCount: f._count.patents,
    })
    if (result.percentage < threshold) {
      laggards.push({
        userId: f.user.id,
        name: `${f.user.firstName} ${f.user.lastName}`.trim(),
        email: f.user.email,
        role: 'FACULTY',
        departmentName: 'Faculty',
        completenessPercentage: result.percentage,
        missingSections: result.missingSections,
      })
    }
  }

  return laggards.sort((a, b) => a.completenessPercentage - b.completenessPercentage)
}

export async function criterionCoverageReport(input: {
  principal: AuthenticatedPrincipal
  includeUnverified?: boolean
}): Promise<CriterionCoverageRow[]> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal
  const includeUnverified = Boolean(input.includeUnverified)

  const [customCriterionTags, itemTags] = await Promise.all([
    prisma.criterionTag.findMany({
      where: { institutionId, itemType: 'REFERENCE_CODE' },
      select: { itemId: true, criterionCode: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.criterionTag.findMany({
      where: {
        institutionId,
        itemType: { notIn: ['INSTITUTION_SETTING', 'REFERENCE_CODE'] },
      },
      select: { itemType: true, itemId: true, criterionCode: true },
    }),
  ])

  const customCriteria: CriterionReferenceItem[] = customCriterionTags.map((tag) => {
    const parts = tag.criterionCode.split(':::')
    return {
      code: tag.itemId,
      label: parts.length > 1 ? parts.slice(1).join(':::') : tag.criterionCode,
    }
  })

  const existingCodes = new Set(customCriteria.map((c) => c.code))
  const allCriteria: CriterionReferenceItem[] = [
    ...DEFAULT_ACCREDITATION_CRITERIA.filter((c) => !existingCodes.has(c.code)),
    ...customCriteria,
  ]

  // Group itemIds by itemType to verify underlying verificationStatus
  const idsByType = new Map<string, string[]>()
  for (const tag of itemTags) {
    const list = idsByType.get(tag.itemType) ?? []
    list.push(tag.itemId)
    idsByType.set(tag.itemType, list)
  }

  const verifiedIdsByType = new Map<string, Set<string>>()
  const fetchVerifiedIds = async (
    itemType: string,
    query: (ids: string[]) => Promise<Array<{ id: string }>>,
  ) => {
    const ids = idsByType.get(itemType)
    if (!ids?.length) return
    const rows = await query(ids)
    verifiedIdsByType.set(itemType, new Set(rows.map((r) => r.id)))
  }

  await Promise.all([
    fetchVerifiedIds('ACHIEVEMENT', (ids) =>
      prisma.achievement.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
    fetchVerifiedIds('CERTIFICATION', (ids) =>
      prisma.studentCertification.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
    fetchVerifiedIds('RESEARCH_PAPER', (ids) =>
      prisma.studentResearchPaper.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
    fetchVerifiedIds('PATENT', (ids) =>
      prisma.studentPatent.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
    fetchVerifiedIds('INTERNSHIP', (ids) =>
      prisma.studentInternship.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
    fetchVerifiedIds('FACULTY_CERTIFICATION', (ids) =>
      prisma.facultyCertification.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
    fetchVerifiedIds('FACULTY_RESEARCH_PAPER', (ids) =>
      prisma.facultyResearchPaper.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
    fetchVerifiedIds('FACULTY_PATENT', (ids) =>
      prisma.facultyPatent.findMany({
        where: { institutionId, id: { in: ids }, ...(includeUnverified ? {} : { verificationStatus: 'VERIFIED' }) },
        select: { id: true },
      }),
    ),
  ])

  const verifiedCounts = new Map<string, number>()
  const totalTaggedCounts = new Map<string, number>()

  for (const tag of itemTags) {
    totalTaggedCounts.set(tag.criterionCode, (totalTaggedCounts.get(tag.criterionCode) ?? 0) + 1)
    const verifiedSet = verifiedIdsByType.get(tag.itemType)
    if (verifiedSet?.has(tag.itemId)) {
      verifiedCounts.set(tag.criterionCode, (verifiedCounts.get(tag.criterionCode) ?? 0) + 1)
    }
  }

  return allCriteria.map((criterion) => {
    const verifiedCount = verifiedCounts.get(criterion.code) ?? 0
    const totalTaggedCount = totalTaggedCounts.get(criterion.code) ?? 0
    return {
      code: criterion.code,
      label: criterion.label,
      verifiedCount,
      totalTaggedCount,
      isGap: verifiedCount === 0,
    }
  })
}

export async function getAdminAttentionInsights(input: {
  principal: AuthenticatedPrincipal
}): Promise<AdminAttentionInsights> {
  requirePermission(input.principal, 'report:view')
  const { institutionId } = input.principal

  const agingRows = await verificationQueueAging({ principal: input.principal })
  const coverageRows = await criterionCoverageReport({ principal: input.principal })
  const [departments, students] = await Promise.all([
    prisma.department.findMany({
      where: { institutionId },
      select: { id: true },
    }),
    prisma.studentProfile.findMany({
      where: { institutionId, departmentId: { not: null } },
      select: {
        departmentId: true,
        enrollmentNumber: true,
        phone: true,
        user: { select: { _count: { select: { eventEntries: true } } } },
        _count: {
          select: {
            education: true,
            semesterRecords: true,
            achievements: true,
            certifications: true,
            researchPapers: true,
            patents: true,
            projects: true,
            internships: true,
            skills: true,
          },
        },
      },
    }),
  ])

  const pendingOver7DaysCount = agingRows.reduce((sum, r) => sum + r.olderThan7Days, 0)
  const zeroCoverageCriteriaCount = coverageRows.filter((r) => r.isGap).length

  const deptTotals = new Map<string, { sum: number; count: number }>()
  for (const s of students) {
    if (!s.departmentId) continue
    const result = calculateStudentCompleteness({
      hasPersonalInfo: Boolean(s.enrollmentNumber || s.departmentId || s.phone),
      educationCount: s._count.education,
      semesterCount: s._count.semesterRecords,
      achievementCount: s._count.achievements,
      participationCount: s.user._count.eventEntries,
      certificationCount: s._count.certifications,
      researchPaperCount: s._count.researchPapers,
      patentCount: s._count.patents,
      projectCount: s._count.projects,
      internshipCount: s._count.internships,
      skillCount: s._count.skills,
    })
    const entry = deptTotals.get(s.departmentId) ?? { sum: 0, count: 0 }
    entry.sum += result.percentage
    entry.count += 1
    deptTotals.set(s.departmentId, entry)
  }

  let departmentsBelow50Count = 0
  for (const dept of departments) {
    const stats = deptTotals.get(dept.id)
    if (stats && stats.count > 0 && stats.sum / stats.count < 50) {
      departmentsBelow50Count += 1
    }
  }

  return {
    pendingOver7DaysCount,
    departmentsBelow50Count,
    zeroCoverageCriteriaCount,
  }
}

const savedReportSchema = z.object({
  name: z.string().trim().min(1).max(140),
  entityType: z.enum([
    'ACHIEVEMENTS',
    'EVENTS',
    'CERT_RESEARCH_PATENT',
    'VERIFICATION_AGING',
    'COMPLETENESS_LAGGARDS',
    'CRITERION_COVERAGE',
  ]),
  filters: z.record(z.string(), z.unknown()),
})

const savedReportRepository = new PrismaSavedReportRepository()

export async function listSavedReports(input: {
  principal: AuthenticatedPrincipal
}): Promise<SavedReport[]> {
  requirePermission(input.principal, 'report:view')
  return savedReportRepository.listByInstitution({
    institutionId: input.principal.institutionId,
  })
}

export async function saveReportDefinition(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<SavedReport> {
  requirePermission(input.principal, 'report:view')
  const parsed = savedReportSchema.parse(input.data)
  return savedReportRepository.create({
    institutionId: input.principal.institutionId,
    createdByUserId: input.principal.userId,
    name: parsed.name,
    entityType: parsed.entityType,
    filters: parsed.filters as Prisma.InputJsonValue,
  })
}

export async function deleteSavedReportDefinition(input: {
  principal: AuthenticatedPrincipal
  id: string
}): Promise<void> {
  requirePermission(input.principal, 'report:view')
  return savedReportRepository.deleteById({
    institutionId: input.principal.institutionId,
    id: input.id,
  })
}
