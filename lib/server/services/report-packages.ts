import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '@/lib/server/authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { getInstitutionConfigOrDefault } from './institution-config'
import { runStudioReport } from './report-studio'
import {
  isReportPackageKey,
  REPORT_PACKAGES,
  type ReportPackageKey,
} from '@/lib/report-packages'
import type { ReportFilterValues, ReportSummaryMetric } from '@/lib/report-types'

export interface ReportPackageSectionResult {
  id: string
  title: string
  countingUnit: string
  verificationScope: string
  excludedMissingDateCount: number
  summaryMetrics: ReportSummaryMetric[]
  columns: Array<{ key: string; label: string }>
  rows: Array<Record<string, string | number | boolean>>
  totalRows: number
}

export interface GeneratedReportPackage {
  snapshotId: string
  packageKey: ReportPackageKey
  title: string
  institutionName: string
  reportHeaderTitle: string | null
  reportHeaderSubtitle: string | null
  targetLabel: string
  metadata: {
    reportingPeriod: string
    appliedFilters: Record<string, string>
    countingUnits: string[]
    verificationScope: string
    exactnessNote: string
    excludedMissingDateCount: number
    generatedAt: string
    snapshotId: string
    disclaimer: string
  }
  sections: ReportPackageSectionResult[]
  evidencePaths: string[]
}

export interface GenerateReportPackageInput {
  packageKey: string
  sectionIds?: string[]
  academicYearId?: string | null
  departmentId?: string | null
  targetUserId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  includeUnverified?: boolean
  persistSnapshot?: boolean
}

export async function generateReportPackage(
  principal: AuthenticatedPrincipal,
  input: GenerateReportPackageInput,
): Promise<GeneratedReportPackage> {
  requirePermission(principal, 'report:view')
  if (!isReportPackageKey(input.packageKey)) {
    throw new Error(`Unsupported report package: ${input.packageKey}`)
  }

  const def = REPORT_PACKAGES[input.packageKey]
  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)

  if (input.departmentId) {
    assertDepartmentAccess(allowedDepts, input.departmentId)
  }

  const [institution, instConfig, academicYear] = await Promise.all([
    prisma.institution.findUnique({ where: { id: institutionId }, select: { name: true } }),
    getInstitutionConfigOrDefault(institutionId),
    input.academicYearId
      ? prisma.academicYear.findUnique({
          where: { institutionId_id: { institutionId, id: input.academicYearId } },
        })
      : Promise.resolve(null),
  ])

  const selectedIds = new Set(
    input.sectionIds && input.sectionIds.length > 0
      ? input.sectionIds
      : def.sections.filter((s) => s.defaultIncluded).map((s) => s.id),
  )

  const includeUnverified =
    def.key === 'VERIFIED_STUDENT_ACHIEVEMENT_TRANSCRIPT'
      ? false
      : Boolean(input.includeUnverified)

  const reportingPeriod = academicYear
    ? `AY ${academicYear.label}`
    : input.dateFrom || input.dateTo
      ? `${input.dateFrom || 'Start'} to ${input.dateTo || 'Present'}`
      : 'All Recorded Dates'

  const verificationScope = includeUnverified
    ? 'Includes verified, pending, and rejected (provisional) records'
    : 'Verified records only (official baseline)'

  const sections: ReportPackageSectionResult[] = []
  const evidencePaths = new Set<string>()
  let targetLabel = institution?.name ?? 'Attainly Institution'

  if (def.scopeType === 'STUDENT') {
    if (!input.targetUserId) {
      throw new Error('Select a student to generate this student portfolio package.')
    }
    const student = await prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId, userId: input.targetUserId } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { code: true, name: true } },
        semesterRecords: { orderBy: { semesterNumber: 'asc' } },
        achievements: {
          where: includeUnverified ? {} : { verificationStatus: 'VERIFIED' },
          orderBy: { createdAt: 'desc' },
        },
        certifications: {
          where: includeUnverified ? {} : { verificationStatus: 'VERIFIED' },
          orderBy: { createdAt: 'desc' },
        },
        internships: {
          where: includeUnverified ? {} : { verificationStatus: 'VERIFIED' },
          orderBy: { createdAt: 'desc' },
        },
        placementOffers: {
          where: includeUnverified ? {} : { verificationStatus: 'VERIFIED' },
          orderBy: { createdAt: 'desc' },
        },
        graduateOutcome: true,
      },
    })
    if (!student) throw new Error('Student profile not found.')
    assertDepartmentAccess(allowedDepts, student.departmentId)

    targetLabel = `${student.user.firstName} ${student.user.lastName} (${student.enrollmentNumber ?? student.user.email})`

    if (selectedIds.has('academics')) {
      sections.push({
        id: 'academics',
        title: 'Semester Academic Performance',
        countingUnit: '1 row per semester record',
        verificationScope: 'Institutional academic records',
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Semesters Recorded', value: student.semesterRecords.length }],
        columns: [
          { key: 'semester', label: 'Semester' },
          { key: 'sgpa', label: 'SGPA' },
          { key: 'cgpa', label: 'CGPA' },
          { key: 'backlogs', label: 'Backlogs' },
        ],
        rows: student.semesterRecords.map((r) => ({
          semester: r.semesterNumber,
          sgpa: r.sgpa,
          cgpa: r.cgpaAtSemester,
          backlogs: r.backlogCount ?? 0,
        })),
        totalRows: student.semesterRecords.length,
      })
    }

    if (selectedIds.has('achievements')) {
      for (const a of student.achievements) {
        for (const u of a.documentUrls) evidencePaths.add(u)
      }
      sections.push({
        id: 'achievements',
        title: 'Achievements & Co-Curriculars',
        countingUnit: '1 row per achievement record',
        verificationScope,
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Achievements', value: student.achievements.length }],
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'category', label: 'Category' },
          { key: 'status', label: 'Outcome' },
          { key: 'date', label: 'Date' },
          { key: 'verificationStatus', label: 'Verification' },
        ],
        rows: student.achievements.map((a) => ({
          title: a.title,
          category: a.categoryCode ?? a.category,
          status: a.status,
          date: (a.awardedAt ?? a.createdAt).toISOString().slice(0, 10),
          verificationStatus: a.verificationStatus,
        })),
        totalRows: student.achievements.length,
      })
    }

    if (selectedIds.has('certifications')) {
      for (const c of student.certifications) {
        if (c.fileUrl) evidencePaths.add(c.fileUrl)
      }
      sections.push({
        id: 'certifications',
        title: 'Professional Certifications',
        countingUnit: '1 row per certification',
        verificationScope,
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Certifications', value: student.certifications.length }],
        columns: [
          { key: 'name', label: 'Certification' },
          { key: 'issuer', label: 'Issuer' },
          { key: 'credentialId', label: 'Credential ID' },
          { key: 'verificationStatus', label: 'Verification' },
        ],
        rows: student.certifications.map((c) => ({
          name: c.name,
          issuer: c.issuer ?? '—',
          credentialId: c.credentialId ?? '—',
          verificationStatus: c.verificationStatus,
        })),
        totalRows: student.certifications.length,
      })
    }

    if (selectedIds.has('internships')) {
      for (const i of student.internships) {
        if (i.evidenceUrl) evidencePaths.add(i.evidenceUrl)
      }
      sections.push({
        id: 'internships',
        title: 'Internships',
        countingUnit: '1 row per internship',
        verificationScope,
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Internships', value: student.internships.length }],
        columns: [
          { key: 'organization', label: 'Organization' },
          { key: 'role', label: 'Role' },
          { key: 'offerType', label: 'PPO / Conversion' },
          { key: 'verificationStatus', label: 'Verification' },
        ],
        rows: student.internships.map((i) => ({
          organization: i.organization,
          role: i.role ?? '—',
          offerType: i.offerType,
          verificationStatus: i.verificationStatus,
        })),
        totalRows: student.internships.length,
      })
    }

    if (selectedIds.has('placements')) {
      for (const p of student.placementOffers) {
        if (p.offerLetterUrl) evidencePaths.add(p.offerLetterUrl)
      }
      sections.push({
        id: 'placements',
        title: 'Placement Offers & Graduate Outcome',
        countingUnit: '1 row per placement offer',
        verificationScope,
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Placement Offers', value: student.placementOffers.length }],
        columns: [
          { key: 'company', label: 'Company' },
          { key: 'role', label: 'Role' },
          { key: 'packageCtc', label: 'Package' },
          { key: 'status', label: 'Offer Status' },
        ],
        rows: student.placementOffers.map((p) => ({
          company: p.companyName,
          role: p.role,
          packageCtc: p.packageCtc ?? '—',
          status: p.status,
        })),
        totalRows: student.placementOffers.length,
      })
    }

    if (selectedIds.has('events')) {
      const parts = await prisma.eventParticipation.findMany({
        where: { institutionId, userId: student.userId, attendanceStatus: 'CONFIRMED' },
        include: { event: { select: { title: true, startsAt: true, categoryCode: true } } },
        orderBy: { createdAt: 'desc' },
      })
      sections.push({
        id: 'events',
        title: 'Confirmed Event Participations',
        countingUnit: '1 row per confirmed event participation',
        verificationScope: 'Confirmed attendance only',
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Events Attended', value: parts.length }],
        columns: [
          { key: 'event', label: 'Event' },
          { key: 'role', label: 'Role' },
          { key: 'date', label: 'Date' },
        ],
        rows: parts.map((p) => ({
          event: p.event.title,
          role: p.role,
          date: p.event.startsAt.toISOString().slice(0, 10),
        })),
        totalRows: parts.length,
      })
    }
  } else if (def.scopeType === 'FACULTY') {
    if (!input.targetUserId) {
      throw new Error('Select a faculty member to generate this faculty portfolio package.')
    }
    const faculty = await prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId, userId: input.targetUserId } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: { select: { code: true, name: true } },
        education: true,
        experiences: true,
        teachingLoads: true,
        developmentPrograms: {
          where: includeUnverified ? {} : { verificationStatus: 'VERIFIED' },
        },
        researchGrants: {
          where: includeUnverified ? {} : { verificationStatus: 'VERIFIED' },
        },
        consultancies: {
          where: includeUnverified ? {} : { verificationStatus: 'VERIFIED' },
        },
        publicationLinks: {
          include: { canonicalPublication: true },
        },
      },
    })
    if (!faculty) throw new Error('Faculty profile not found.')
    assertDepartmentAccess(allowedDepts, faculty.departmentId)

    targetLabel = `${faculty.user.firstName} ${faculty.user.lastName} (${faculty.employeeId ?? faculty.user.email})`

    if (selectedIds.has('qualifications')) {
      sections.push({
        id: 'qualifications',
        title: 'Academic Qualifications',
        countingUnit: '1 row per qualification',
        verificationScope: 'Institutional faculty profile',
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Qualifications', value: faculty.education.length }],
        columns: [
          { key: 'qualification', label: 'Degree' },
          { key: 'institution', label: 'Institution' },
          { key: 'year', label: 'Year' },
        ],
        rows: faculty.education.map((e) => ({
          qualification: e.qualification,
          institution: e.institutionName,
          year: e.yearCompleted ?? '—',
        })),
        totalRows: faculty.education.length,
      })
    }

    if (selectedIds.has('experience')) {
      sections.push({
        id: 'experience',
        title: 'Teaching & Industry Experience',
        countingUnit: '1 row per experience entry',
        verificationScope: 'Institutional faculty profile',
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Experience Entries', value: faculty.experiences.length }],
        columns: [
          { key: 'type', label: 'Type' },
          { key: 'organization', label: 'Organization' },
          { key: 'title', label: 'Role' },
        ],
        rows: faculty.experiences.map((e) => ({
          type: e.type,
          organization: e.organization,
          title: e.title,
        })),
        totalRows: faculty.experiences.length,
      })
    }

    if (selectedIds.has('workload')) {
      sections.push({
        id: 'workload',
        title: 'Teaching Workload',
        countingUnit: '1 row per subject assignment',
        verificationScope: 'Institutional workload records',
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Courses Taught', value: faculty.teachingLoads.length }],
        columns: [
          { key: 'academicYear', label: 'Academic Year' },
          { key: 'semester', label: 'Semester' },
          { key: 'subject', label: 'Subject' },
          { key: 'hoursPerWeek', label: 'Hours/Week' },
        ],
        rows: faculty.teachingLoads.map((w) => ({
          academicYear: w.academicYear,
          semester: w.semester,
          subject: w.subjectCode ? `${w.subjectCode} — ${w.subjectName}` : w.subjectName,
          hoursPerWeek: w.hoursPerWeek,
        })),
        totalRows: faculty.teachingLoads.length,
      })
    }

    if (selectedIds.has('fdps')) {
      for (const f of faculty.developmentPrograms) {
        if (f.documentUrl) evidencePaths.add(f.documentUrl)
      }
      sections.push({
        id: 'fdps',
        title: 'FDPs & Professional Development',
        countingUnit: '1 row per FDP/workshop',
        verificationScope,
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'FDP Programs', value: faculty.developmentPrograms.length }],
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'organizer', label: 'Organizer' },
          { key: 'mode', label: 'Mode' },
          { key: 'startDate', label: 'Start Date' },
        ],
        rows: faculty.developmentPrograms.map((f) => ({
          title: f.title,
          organizer: f.organizer,
          mode: f.mode,
          startDate: f.startDate.toISOString().slice(0, 10),
        })),
        totalRows: faculty.developmentPrograms.length,
      })
    }

    if (selectedIds.has('publications')) {
      const pubs = faculty.publicationLinks
        .map((l) => l.canonicalPublication)
        .filter((p) => includeUnverified || p.verificationStatus === 'VERIFIED')
      for (const p of pubs) {
        if (p.fileUrl) evidencePaths.add(p.fileUrl)
      }
      sections.push({
        id: 'publications',
        title: 'Research Publications',
        countingUnit: '1 row per canonical publication',
        verificationScope,
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Publications', value: pubs.length }],
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'venue', label: 'Venue' },
          { key: 'doi', label: 'DOI' },
          { key: 'indexing', label: 'Indexing' },
        ],
        rows: pubs.map((p) => ({
          title: p.title,
          venue: p.journalOrConference ?? '—',
          doi: p.doi ?? '—',
          indexing: p.indexing ?? '—',
        })),
        totalRows: pubs.length,
      })
    }

    if (selectedIds.has('grants_consultancy')) {
      for (const g of faculty.researchGrants) if (g.documentUrl) evidencePaths.add(g.documentUrl)
      for (const c of faculty.consultancies) if (c.documentUrl) evidencePaths.add(c.documentUrl)
      const combined = [
        ...faculty.researchGrants.map((g) => ({
          kind: 'Grant',
          title: g.title,
          partner: g.fundingAgency,
          amount: g.amount ?? '—',
        })),
        ...faculty.consultancies.map((c) => ({
          kind: 'Consultancy',
          title: c.title,
          partner: c.clientOrganization,
          amount: c.amount ?? '—',
        })),
      ]
      sections.push({
        id: 'grants_consultancy',
        title: 'Research Grants & Consultancy',
        countingUnit: '1 row per grant or consultancy',
        verificationScope,
        excludedMissingDateCount: 0,
        summaryMetrics: [{ label: 'Total Projects', value: combined.length }],
        columns: [
          { key: 'kind', label: 'Type' },
          { key: 'title', label: 'Title' },
          { key: 'partner', label: 'Agency / Client' },
          { key: 'amount', label: 'Amount' },
        ],
        rows: combined,
        totalRows: combined.length,
      })
    }
  } else {
    // Department, Institution, or Thematic Package -> reuse runStudioReport directly!
    const filters: ReportFilterValues = {
      academicYearId: input.academicYearId ?? undefined,
      departmentId: input.departmentId ?? undefined,
      dateFrom: input.dateFrom ?? undefined,
      dateTo: input.dateTo ?? undefined,
      includeUnverified,
      pageSize: 200,
    }

    for (const sec of def.sections) {
      if (!selectedIds.has(sec.id) || !sec.reportEntityType) continue
      const studioRes = await runStudioReport(principal, sec.reportEntityType, filters)
      sections.push({
        id: sec.id,
        title: sec.label,
        countingUnit: studioRes.countingUnit ?? sec.label,
        verificationScope: studioRes.verificationScope ?? verificationScope,
        excludedMissingDateCount: studioRes.excludedMissingDateCount ?? 0,
        summaryMetrics: studioRes.summaryMetrics ?? [],
        columns: studioRes.columns,
        rows: studioRes.rows,
        totalRows: studioRes.totalRows ?? studioRes.rows.length,
      })
    }
  }

  const totalExcludedMissing = sections.reduce((acc, s) => acc + s.excludedMissingDateCount, 0)
  const generatedAt = new Date().toISOString()

  const payloadWithoutId = {
    packageKey: def.key,
    title: def.label,
    institutionName: institution?.name ?? 'Attainly Institution',
    reportHeaderTitle: instConfig.reportHeaderTitle,
    reportHeaderSubtitle: instConfig.reportHeaderSubtitle,
    targetLabel,
    metadata: {
      reportingPeriod,
      appliedFilters: {
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        ...(input.academicYearId ? { academicYearId: input.academicYearId } : {}),
        ...(input.targetUserId ? { targetUserId: input.targetUserId } : {}),
      },
      countingUnits: [...new Set(sections.map((s) => s.countingUnit))],
      verificationScope,
      exactnessNote: 'Exact institutional database counts (non-sampled)',
      excludedMissingDateCount: totalExcludedMissing,
      generatedAt,
      snapshotId: 'PREVIEW',
      disclaimer:
        'Attainly compiles institutional records and verified counts. Templates do not fabricate accreditation scores or guarantee full NAAC/NBA/AICTE compliance.',
    },
    sections,
    evidencePaths: [...evidencePaths],
  }

  let snapshotId = `SNAP-${Date.now()}`
  if (input.persistSnapshot !== false) {
    const snap = await prisma.reportSnapshot.create({
      data: {
        institutionId,
        name: `${def.label} — ${reportingPeriod}`,
        entityType: def.key,
        filters: payloadWithoutId.metadata.appliedFilters as unknown as Prisma.InputJsonValue,
        metricDefinition: payloadWithoutId.metadata.countingUnits.join(' | ') || def.label,
        verificationScope,
        rowCount: sections.reduce((acc, s) => acc + s.totalRows, 0),
        payload: payloadWithoutId as unknown as Prisma.InputJsonValue,
        createdByUserId: principal.userId,
      },
      select: { id: true },
    })
    snapshotId = snap.id
  }

  payloadWithoutId.metadata.snapshotId = snapshotId
  return {
    snapshotId,
    ...payloadWithoutId,
  }
}
