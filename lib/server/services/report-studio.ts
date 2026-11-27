import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Prisma } from '@/generated/prisma/client'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { REPORT_REGISTRY, type ReportEntityType } from '@/lib/reporting-registry'
import type { ReportFilterValues, ReportSummaryMetric, ReportTableResult } from '@/lib/report-types'
import {
  computeDistinctPublicationStats,
  computeEventParticipationMetrics,
  computePlacementMetrics,
  isWithinDateWindow,
  resolveActivityDateWithFlag,
  resolveEffectiveActivityDate,
  type DateWindow,
} from './reporting-math'
import {
  criterionCoverageReport,
  profileCompletenessLaggards,
  verificationQueueAging,
} from './reports'

async function resolveDateWindow(
  institutionId: string,
  filters: ReportFilterValues,
): Promise<{ window?: DateWindow; label?: string }> {
  let from: Date | undefined
  let to: Date | undefined
  let label: string | undefined

  if (filters.academicYearId) {
    const ay = await prisma.academicYear.findUnique({
      where: { institutionId_id: { institutionId, id: filters.academicYearId } },
    })
    if (ay) {
      from = ay.startDate
      to = ay.endDate
      label = ay.label
    }
  }
  if (filters.dateFrom) {
    const d = new Date(filters.dateFrom)
    if (!Number.isNaN(d.getTime())) from = d
  }
  if (filters.dateTo) {
    const d = new Date(filters.dateTo)
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999)
      to = d
    }
  }
  return {
    window: from || to ? { from, to } : undefined,
    label,
  }
}

function buildVerificationWhere(filters: ReportFilterValues) {
  if (filters.verificationStatus && filters.verificationStatus !== 'ALL') {
    return { verificationStatus: filters.verificationStatus }
  }
  if (filters.includeUnverified) return {}
  return { verificationStatus: 'VERIFIED' as const }
}

function applySortAndPaginate<T extends Record<string, string | number | boolean>>(
  rows: T[],
  filters: ReportFilterValues,
): { pagedRows: T[]; totalRows: number; page: number; pageSize: number } {
  const sorted = [...rows]
  if (filters.sortBy) {
    const key = filters.sortBy
    const dir = filters.sortDir === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      const av = a[key] ?? ''
      const bv = b[key] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 500)
  const page = Math.max(filters.page ?? 1, 1)
  const start = (page - 1) * pageSize
  return {
    pagedRows: sorted.slice(start, start + pageSize),
    totalRows: sorted.length,
    page,
    pageSize,
  }
}

function applyGrouping<T extends Record<string, string | number | boolean>>(
  rows: T[],
  groupBy: string | undefined,
): { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, string | number | boolean>> } | null {
  if (!groupBy) return null
  const map = new Map<string, number>()
  for (const row of rows) {
    const keyVal = String(row[groupBy] ?? 'Unspecified')
    map.set(keyVal, (map.get(keyVal) ?? 0) + 1)
  }
  return {
    columns: [
      { key: 'groupValue', label: groupBy },
      { key: 'recordCount', label: 'Record Count' },
    ],
    rows: Array.from(map.entries())
      .map(([groupValue, recordCount]) => ({ groupValue, recordCount }))
      .sort((a, b) => Number(b.recordCount) - Number(a.recordCount)),
  }
}

export async function runStudioReport(
  principal: AuthenticatedPrincipal,
  entityType: ReportEntityType,
  filters: ReportFilterValues = {},
): Promise<ReportTableResult> {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const registry = REPORT_REGISTRY[entityType]
  if (!registry) throw new Error(`Unsupported report type: ${entityType}`)

  const allowedDepts = await resolveDepartmentScope(principal)
  if (filters.departmentId) assertDepartmentAccess(allowedDepts, filters.departmentId)

  const deptScopeFilter = filters.departmentId
    ? filters.departmentId
    : allowedDepts
      ? { in: allowedDepts }
      : undefined

  const [institution, { window: dateWindow, label: ayLabel }] = await Promise.all([
    prisma.institution.findUnique({ where: { id: institutionId }, select: { name: true } }),
    resolveDateWindow(institutionId, filters),
  ])

  const includeUnverified = Boolean(filters.includeUnverified || filters.verificationStatus === 'ALL')
  const verificationWhere = buildVerificationWhere(filters)
  const verificationScope =
    filters.verificationStatus && filters.verificationStatus !== 'ALL'
      ? `${filters.verificationStatus} records only`
      : includeUnverified
        ? 'Includes verified, pending, and rejected (provisional) records'
        : 'Verified records only (official baseline)'

  const generatedAt = new Date().toISOString()
  let rawRows: Array<Record<string, string | number | boolean>> = []
  let summaryMetrics: ReportSummaryMetric[] = []
  let columns = registry.columns
    .filter((c) => !filters.selectedColumns?.length || filters.selectedColumns.includes(c.key))
    .map((c) => ({ key: c.key, label: c.label }))

  switch (entityType) {
    case 'STUDENT_ACADEMICS': {
      const records = await prisma.studentSemesterRecord.findMany({
        where: {
          institutionId,
          ...(filters.semester ? { semesterNumber: filters.semester } : {}),
          studentProfile: {
            ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
            ...(filters.courseId ? { courseId: filters.courseId } : {}),
            ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
          },
        },
        include: {
          studentProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              department: { select: { code: true } },
            },
          },
        },
        orderBy: [{ semesterNumber: 'asc' }],
      })
      const uniqueStudents = new Set(records.map((r) => r.studentProfileId)).size
      summaryMetrics = [
        { label: 'Unique Students', value: uniqueStudents },
        { label: 'Semester Records', value: records.length },
      ]
      rawRows = records.map((r) => ({
        studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`,
        enrollmentNumber: r.studentProfile.enrollmentNumber ?? '—',
        departmentCode: r.studentProfile.department?.code ?? 'Unassigned',
        batchYear: r.studentProfile.admissionYear ?? '—',
        semester: r.semesterNumber,
        sgpa: r.sgpa ?? '—',
        cgpa: r.cgpaAtSemester ?? '—',
        backlogsCount: r.backlogCount ?? 0,
      }))
      break
    }

    case 'ACHIEVEMENTS':
    case 'SPORTS_CULTURAL':
    case 'HACKATHONS': {
      const catFilter: Prisma.AchievementWhereInput =
        entityType === 'SPORTS_CULTURAL'
          ? { category: { in: ['SPORTS', 'CULTURAL'] } }
          : entityType === 'HACKATHONS'
            ? { category: 'TECHNICAL' }
            : filters.categoryCode
              ? { OR: [{ categoryCode: filters.categoryCode }, { category: filters.categoryCode as never }] }
              : {}

      const rows = await prisma.achievement.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          ...catFilter,
          ...(filters.participationLevel ? { participationLevel: filters.participationLevel } : {}),
          ...(filters.result ? { status: filters.result as never } : {}),
          studentProfile: {
            ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
            ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
          },
        },
        include: {
          studentProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
              department: { select: { code: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const dateFiltered = rows.filter((r) =>
        isWithinDateWindow(resolveEffectiveActivityDate(r.awardedAt, r.createdAt), dateWindow),
      )
      const uniqueStudents = new Set(dateFiltered.map((r) => r.studentProfileId)).size
      const missingDateCount = dateFiltered.filter((r) => !r.awardedAt).length
      summaryMetrics = [
        { label: 'Activity Records', value: dateFiltered.length },
        { label: 'Unique Students', value: uniqueStudents },
        ...(missingDateCount > 0 ? [{ label: 'Missing Activity Date (Fallback)', value: missingDateCount }] : []),
      ]
      rawRows = dateFiltered.map((r) => {
        const resolved = resolveActivityDateWithFlag(r.awardedAt, r.createdAt)
        return {
          title: r.title,
          studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`,
          enrollmentNumber: r.studentProfile.enrollmentNumber ?? '—',
          departmentCode: r.studentProfile.department?.code ?? 'Unassigned',
          category: r.categoryCode ?? r.category,
          teamName: r.teamName ?? 'Individual',
          participationLevel: r.participationLevel ?? '—',
          status: r.status,
          activityDate: resolved.isFallbackCreatedAt
            ? `${resolved.date.toISOString().slice(0, 10)} (fallback)`
            : resolved.date.toISOString().slice(0, 10),
          verificationStatus: r.verificationStatus,
        }
      })
      break
    }

    case 'CERTIFICATIONS': {
      const [sCerts, fCerts] = await Promise.all([
        prisma.studentCertification.findMany({
          where: {
            institutionId,
            ...verificationWhere,
            studentProfile: {
              ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
              ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
            },
          },
          include: {
            studentProfile: {
              include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
            },
          },
        }),
        prisma.facultyCertification.findMany({
          where: {
            institutionId,
            ...verificationWhere,
            facultyProfile: {
              ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
            },
          },
          include: {
            facultyProfile: {
              include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
            },
          },
        }),
      ])

      const combined = [
        ...sCerts
          .filter((c) => isWithinDateWindow(resolveEffectiveActivityDate(c.issuedAt, c.createdAt), dateWindow))
          .map((c) => ({
            ownerKey: `S:${c.studentProfileId}`,
            name: c.name,
            issuer: c.issuer ?? '—',
            ownerName: `${c.studentProfile.user.firstName} ${c.studentProfile.user.lastName}`,
            ownerRole: 'STUDENT',
            departmentCode: c.studentProfile.department?.code ?? 'Unassigned',
            issuedDate: resolveEffectiveActivityDate(c.issuedAt, c.createdAt).toISOString().slice(0, 10),
            verificationStatus: c.verificationStatus,
          })),
        ...fCerts
          .filter((c) => isWithinDateWindow(resolveEffectiveActivityDate(c.issuedAt, c.createdAt), dateWindow))
          .map((c) => ({
            ownerKey: `F:${c.facultyProfileId}`,
            name: c.name,
            issuer: c.issuer ?? '—',
            ownerName: `${c.facultyProfile.user.firstName} ${c.facultyProfile.user.lastName}`,
            ownerRole: 'FACULTY',
            departmentCode: c.facultyProfile.department?.code ?? 'Unassigned',
            issuedDate: resolveEffectiveActivityDate(c.issuedAt, c.createdAt).toISOString().slice(0, 10),
            verificationStatus: c.verificationStatus,
          })),
      ]
      summaryMetrics = [
        { label: 'Certification Records', value: combined.length },
        { label: 'Unique Earners', value: new Set(combined.map((c) => c.ownerKey)).size },
      ]
      rawRows = combined.map(({ ownerKey: _k, ...rest }) => rest)
      break
    }

    case 'INTERNSHIPS': {
      const rows = await prisma.studentInternship.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          studentProfile: {
            ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
            ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
          },
        },
        include: {
          studentProfile: {
            include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
          },
        },
      })
      const filtered = rows.filter((r) => isWithinDateWindow(resolveEffectiveActivityDate(r.startDate, r.createdAt), dateWindow))
      summaryMetrics = [
        { label: 'Internship Records', value: filtered.length },
        { label: 'Unique Students', value: new Set(filtered.map((r) => r.studentProfileId)).size },
      ]
      rawRows = filtered.map((r) => ({
        company: r.organization,
        role: r.role ?? '—',
        studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`,
        departmentCode: r.studentProfile.department?.code ?? 'Unassigned',
        batchYear: r.studentProfile.admissionYear ?? '—',
        startDate: resolveEffectiveActivityDate(r.startDate, r.createdAt).toISOString().slice(0, 10),
        stipend: r.stipendAmount ?? '—',
        verificationStatus: r.verificationStatus,
      }))
      break
    }

    case 'PLACEMENTS': {
      const rows = await prisma.studentPlacementOffer.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          studentProfile: {
            ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
            ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
          },
        },
        include: {
          studentProfile: {
            include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
          },
        },
      })
      const filtered = rows.filter((r) => isWithinDateWindow(resolveEffectiveActivityDate(r.offeredAt, r.createdAt), dateWindow))
      const metrics = computePlacementMetrics(
        filtered.map((r) => {
          const num = r.packageCtc ? Number.parseFloat(r.packageCtc.replace(/[^0-9.]/g, '')) : null
          return {
            studentProfileId: r.studentProfileId,
            packageLpa: num !== null && Number.isFinite(num) ? num : null,
            offerStatus: r.status,
            verificationStatus: r.verificationStatus,
          }
        }),
        true,
      )
      summaryMetrics = [
        { label: 'Offers Received', value: metrics.offersReceived },
        { label: 'Students with Offers', value: metrics.studentsReceivingOffers },
        { label: 'Accepted Offers', value: metrics.acceptedOffers },
        { label: 'Confirmed Placed Students', value: metrics.confirmedPlacedStudents },
      ]
      rawRows = filtered.map((r) => ({
        studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`,
        enrollmentNumber: r.studentProfile.enrollmentNumber ?? '—',
        departmentCode: r.studentProfile.department?.code ?? 'Unassigned',
        batchYear: r.studentProfile.admissionYear ?? '—',
        companyName: r.companyName,
        roleTitle: r.role,
        packageLpa: r.packageCtc ?? '—',
        offerStatus: r.status,
        verificationStatus: r.verificationStatus,
      }))
      break
    }

    case 'HIGHER_EDUCATION': {
      const rows = await prisma.studentGraduateOutcome.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          studentProfile: {
            ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
            ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
          },
        },
        include: {
          studentProfile: {
            include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
          },
        },
      })
      summaryMetrics = [
        { label: 'Graduate Outcomes', value: rows.length },
        { label: 'Unique Students', value: new Set(rows.map((r) => r.studentProfileId)).size },
      ]
      rawRows = rows.map((r) => ({
        studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`,
        departmentCode: r.studentProfile.department?.code ?? 'Unassigned',
        outcomeType: r.outcomeType,
        institutionOrVenture: r.organizationOrUniversity ?? '—',
        programOrExam: r.programOrRole ?? '—',
        admissionYear: r.recordedAt.getFullYear(),
        verificationStatus: r.verificationStatus,
      }))
      break
    }

    case 'FACULTY_QUALIFICATIONS': {
      const rows = await prisma.facultyEducation.findMany({
        where: {
          institutionId,
          facultyProfile: { ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}) },
        },
        include: {
          facultyProfile: {
            include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
          },
        },
      })
      summaryMetrics = [
        { label: 'Qualification Records', value: rows.length },
        { label: 'Unique Faculty', value: new Set(rows.map((r) => r.facultyProfileId)).size },
      ]
      rawRows = rows.map((r) => ({
        facultyName: `${r.facultyProfile.user.firstName} ${r.facultyProfile.user.lastName}`,
        employeeId: r.facultyProfile.employeeId ?? '—',
        departmentCode: r.facultyProfile.department?.code ?? 'Unassigned',
        degree: r.qualification,
        specialization: r.fieldOfStudy ?? '—',
        institutionName: r.institutionName,
        yearOfCompletion: r.yearCompleted ?? '—',
      }))
      break
    }

    case 'FACULTY_EXPERIENCE': {
      const rows = await prisma.facultyProfile.findMany({
        where: { institutionId, ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}) },
        include: {
          user: { select: { firstName: true, lastName: true } },
          department: { select: { code: true } },
          experiences: true,
        },
      })
      summaryMetrics = [{ label: 'Unique Faculty Profiles', value: rows.length }]
      rawRows = rows.map((r) => {
        const calcYears = (type: string) =>
          Math.round(
            r.experiences
              .filter((e) => e.type === type && e.startDate)
              .reduce((acc, e) => {
                const end = e.endDate ?? new Date()
                return acc + Math.max(0, (end.getTime() - e.startDate!.getTime()) / (365.25 * 24 * 3600 * 1000))
              }, 0) * 10,
          ) / 10
        return {
          facultyName: `${r.user.firstName} ${r.user.lastName}`,
          employeeId: r.employeeId ?? '—',
          departmentCode: r.department?.code ?? 'Unassigned',
          designation: r.designation ?? '—',
          employmentStatus: r.employmentStatus,
          teachingYears: calcYears('TEACHING'),
          industryYears: calcYears('INDUSTRY'),
        }
      })
      break
    }

    case 'RESEARCH_PUBLICATIONS': {
      const [canonical, facultyPapers] = await Promise.all([
        prisma.canonicalPublication.findMany({
          where: {
            institutionId,
            ...verificationWhere,
            ...(deptScopeFilter
              ? { contributors: { some: { facultyProfile: { departmentId: deptScopeFilter } } } }
              : {}),
          },
          include: { _count: { select: { contributors: true } } },
        }),
        prisma.facultyResearchPaper.findMany({
          where: {
            institutionId,
            ...verificationWhere,
            facultyProfile: { ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}) },
          },
        }),
      ])

      const allPubs = [
        ...canonical
          .filter((p) => isWithinDateWindow(resolveEffectiveActivityDate(p.publishedAt, p.createdAt), dateWindow))
          .map((p) => ({
            id: p.id,
            title: p.title,
            sourceScope: 'Canonical Publication',
            venue: p.journalOrConference ?? '—',
            doi: p.doi ?? '—',
            indexing: p.indexing ?? '—',
            authorCount: Math.max(1, p._count.contributors),
            publishedDate: resolveEffectiveActivityDate(p.publishedAt, p.createdAt).toISOString().slice(0, 10),
            verificationStatus: p.verificationStatus,
          })),
        ...facultyPapers
          .filter((p) => isWithinDateWindow(resolveEffectiveActivityDate(p.publishedAt, p.createdAt), dateWindow))
          .map((p) => ({
            id: p.id,
            title: p.title,
            sourceScope: 'Faculty Paper',
            venue: p.publication ?? '—',
            doi: p.doi ?? '—',
            indexing: '—',
            authorCount: 1,
            publishedDate: resolveEffectiveActivityDate(p.publishedAt, p.createdAt).toISOString().slice(0, 10),
            verificationStatus: p.verificationStatus,
          })),
      ]

      const pubMetrics = computeDistinctPublicationStats(
        allPubs.map((p) => ({
          id: p.id,
          doi: p.doi === '—' ? null : p.doi,
          title: p.title,
          verificationStatus: p.verificationStatus,
          authorCount: p.authorCount,
        })),
        true,
      )
      summaryMetrics = [
        { label: 'Distinct Publications', value: pubMetrics.distinctPublications },
        { label: 'Total Records', value: pubMetrics.totalRecords },
        { label: 'Author Credits', value: pubMetrics.totalAuthorCredits },
      ]
      rawRows = allPubs.map(({ id: _id, ...rest }) => rest)
      break
    }

    case 'FACULTY_FDPS': {
      const rows = await prisma.facultyDevelopmentProgram.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          facultyProfile: { ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}) },
        },
        include: {
          facultyProfile: {
            include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
          },
        },
      })
      const filtered = rows.filter((r) => isWithinDateWindow(resolveEffectiveActivityDate(r.startDate, r.createdAt), dateWindow))
      summaryMetrics = [
        { label: 'FDP / STTP Records', value: filtered.length },
        { label: 'Unique Faculty', value: new Set(filtered.map((r) => r.facultyProfileId)).size },
      ]
      rawRows = filtered.map((r) => ({
        title: r.title,
        facultyName: `${r.facultyProfile.user.firstName} ${r.facultyProfile.user.lastName}`,
        departmentCode: r.facultyProfile.department?.code ?? 'Unassigned',
        organizer: r.organizer,
        mode: r.mode,
        startDate: r.startDate.toISOString().slice(0, 10),
        endDate: r.endDate.toISOString().slice(0, 10),
        verificationStatus: r.verificationStatus,
      }))
      break
    }

    case 'FACULTY_CONSULTANCY': {
      const rows = await prisma.facultyConsultancy.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          facultyProfile: { ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}) },
        },
        include: {
          facultyProfile: {
            include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
          },
        },
      })
      const filtered = rows.filter((r) => isWithinDateWindow(resolveEffectiveActivityDate(r.startDate, r.createdAt), dateWindow))
      const totalAmount = filtered.reduce((acc, r) => acc + (Number(r.amount) || 0), 0)
      summaryMetrics = [
        { label: 'Consultancy Projects', value: filtered.length },
        { label: 'Unique Faculty', value: new Set(filtered.map((r) => r.facultyProfileId)).size },
        { label: 'Total Amount', value: totalAmount },
      ]
      rawRows = filtered.map((r) => ({
        title: r.title,
        facultyName: `${r.facultyProfile.user.firstName} ${r.facultyProfile.user.lastName}`,
        departmentCode: r.facultyProfile.department?.code ?? 'Unassigned',
        clientOrganization: r.clientOrganization,
        amount: r.amount ?? 0,
        startDate: r.startDate.toISOString().slice(0, 10),
        verificationStatus: r.verificationStatus,
      }))
      break
    }

    case 'FACULTY_WORKLOAD': {
      const rows = await prisma.facultyTeachingLoad.findMany({
        where: {
          institutionId,
          ...(filters.semester ? { semester: filters.semester } : {}),
          facultyProfile: { ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}) },
        },
        include: {
          facultyProfile: {
            include: { user: { select: { firstName: true, lastName: true } }, department: { select: { code: true } } },
          },
        },
      })
      summaryMetrics = [
        { label: 'Workload Entries', value: rows.length },
        { label: 'Unique Faculty', value: new Set(rows.map((r) => r.facultyProfileId)).size },
      ]
      rawRows = rows.map((r) => ({
        facultyName: `${r.facultyProfile.user.firstName} ${r.facultyProfile.user.lastName}`,
        departmentCode: r.facultyProfile.department?.code ?? 'Unassigned',
        academicYear: r.academicYear,
        semester: r.semester,
        courseCode: r.subjectCode ? `${r.subjectCode} — ${r.subjectName}` : r.subjectName,
        hoursPerWeek: r.hoursPerWeek,
        studentCount: r.studentCount ?? '—',
      }))
      break
    }

    case 'EVENTS': {
      const events = await prisma.event.findMany({
        where: {
          institutionId,
          ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
          ...(filters.eventType ? { OR: [{ type: filters.eventType }, { categoryCode: filters.eventType }] } : {}),
        },
        include: {
          department: { select: { code: true } },
          participation: {
            select: { userId: true, registrationStatus: true, attendanceStatus: true, role: true },
          },
        },
        orderBy: { startsAt: 'desc' },
      })
      const filtered = events.filter((e) => isWithinDateWindow(e.startsAt, dateWindow))
      let totalRegs = 0
      let totalConfirmed = 0
      let totalWinners = 0
      rawRows = filtered.map((e) => {
        const m = computeEventParticipationMetrics(e.participation)
        totalRegs += m.registrations
        totalConfirmed += m.confirmedParticipants
        totalWinners += m.winners
        return {
          title: e.title,
          departmentCode: e.department.code,
          category: e.categoryCode ?? e.type,
          level: e.level,
          status: e.status,
          registeredCount: m.registrations,
          confirmedCount: m.confirmedParticipants,
          winnersCount: m.winners,
          startDate: e.startsAt.toISOString().slice(0, 10),
        }
      })
      summaryMetrics = [
        { label: 'Total Events', value: filtered.length },
        { label: 'Registrations', value: totalRegs },
        { label: 'Confirmed / Attended', value: totalConfirmed },
        { label: 'Winners', value: totalWinners },
      ]
      break
    }

    case 'VERIFICATION_AGING': {
      const aging = await verificationQueueAging({ principal })
      rawRows = aging.map((r) => ({ ...r }))
      summaryMetrics = [{ label: 'Total Pending', value: aging.reduce((s, r) => s + r.totalPending, 0) }]
      break
    }

    case 'COMPLETENESS_LAGGARDS': {
      const laggards = await profileCompletenessLaggards({
        principal,
        departmentId: filters.departmentId ?? null,
        threshold: filters.threshold ?? 50,
      })
      rawRows = laggards.map((r) => ({
        name: r.name,
        email: r.email,
        role: r.role,
        departmentName: r.departmentName,
        completenessPercentage: `${r.completenessPercentage}%`,
        missingSummary: r.missingSections.join(', '),
      }))
      summaryMetrics = [{ label: 'Flagged Profiles', value: laggards.length }]
      break
    }

    case 'CRITERION_COVERAGE': {
      const cov = await criterionCoverageReport({ principal })
      rawRows = cov.map((r) => ({
        code: r.code,
        label: r.label,
        verifiedCount: r.verifiedCount,
        totalTaggedCount: r.totalTaggedCount,
        status: r.isGap ? 'Gap (0 verified)' : 'Covered',
      }))
      summaryMetrics = [{ label: 'Zero-Coverage Criteria', value: cov.filter((c) => c.isGap).length }]
      break
    }

    case 'DATA_QUALITY': {
      const [missingEnrollment, missingStudentDept, missingEmployeeId, unverifiedAch, missingEvidenceAch] =
        await Promise.all([
          prisma.studentProfile.count({ where: { institutionId, enrollmentNumber: null } }),
          prisma.studentProfile.count({ where: { institutionId, departmentId: null } }),
          prisma.facultyProfile.count({ where: { institutionId, employeeId: null } }),
          prisma.achievement.count({ where: { institutionId, verificationStatus: 'PENDING' } }),
          prisma.achievement.count({ where: { institutionId, documentUrls: { isEmpty: true } } }),
        ])
      rawRows = [
        { checkName: 'Students missing enrollment number', scope: 'Student Profiles', issueCount: missingEnrollment, severity: missingEnrollment > 0 ? 'HIGH' : 'OK', recommendation: 'Assign enrollment numbers in Admin → Users & Access' },
        { checkName: 'Students missing department assignment', scope: 'Student Profiles', issueCount: missingStudentDept, severity: missingStudentDept > 0 ? 'HIGH' : 'OK', recommendation: 'Assign department in Student Identity' },
        { checkName: 'Faculty missing employee ID', scope: 'Faculty Profiles', issueCount: missingEmployeeId, severity: missingEmployeeId > 0 ? 'MEDIUM' : 'OK', recommendation: 'Assign employee ID in Faculty Identity' },
        { checkName: 'Pending unverified achievements', scope: 'Verification Queue', issueCount: unverifiedAch, severity: unverifiedAch > 0 ? 'MEDIUM' : 'OK', recommendation: 'Review in Admin → Verifications' },
        { checkName: 'Achievements without supporting evidence URLs', scope: 'Evidence Audit', issueCount: missingEvidenceAch, severity: missingEvidenceAch > 0 ? 'MEDIUM' : 'OK', recommendation: 'Request evidence via Data Collection Requests' },
      ]
      summaryMetrics = [{ label: 'Total Quality Flags', value: rawRows.reduce((s, r) => s + Number(r.issueCount), 0) }]
      break
    }

    default: {
      // CERT_RESEARCH_PATENT fallback
      const aging = await verificationQueueAging({ principal })
      rawRows = aging.map((r) => ({ ...r }))
      break
    }
  }

  const grouped = applyGrouping(rawRows, filters.groupBy)
  const effectiveColumns = grouped ? grouped.columns : columns
  const effectiveRows = grouped ? grouped.rows : rawRows
  const { pagedRows, totalRows, page, pageSize } = applySortAndPaginate(effectiveRows, filters)

  return {
    entityType,
    title: registry.label,
    subtitle: registry.description,
    institutionName: institution?.name ?? 'Attainly Institution',
    countingUnit: registry.countingUnit,
    dateFieldSemantics: registry.dateFieldSemantics,
    verificationScope,
    appliedFilters: {
      ...(ayLabel ? { academicYear: ayLabel } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.batchYear ? { batchYear: String(filters.batchYear) } : {}),
      ...(filters.dateFrom ? { from: filters.dateFrom } : {}),
      ...(filters.dateTo ? { to: filters.dateTo } : {}),
    },
    summaryMetrics,
    columns: effectiveColumns,
    rows: pagedRows,
    totalRows,
    page,
    pageSize,
    generatedAt,
  }
}

export async function createReportSnapshot(
  principal: AuthenticatedPrincipal,
  input: {
    name: string
    savedReportId?: string | null
    result: ReportTableResult
    filters: ReportFilterValues
  },
) {
  requirePermission(principal, 'report:view')
  return prisma.reportSnapshot.create({
    data: {
      institutionId: principal.institutionId,
      savedReportId: input.savedReportId ?? null,
      name: input.name.trim(),
      entityType: input.result.entityType,
      filters: input.filters as unknown as Prisma.InputJsonValue,
      metricDefinition: input.result.countingUnit ?? input.result.subtitle,
      verificationScope: input.result.verificationScope ?? 'Verified records only',
      rowCount: input.result.totalRows ?? input.result.rows.length,
      payload: input.result as unknown as Prisma.InputJsonValue,
      createdByUserId: principal.userId,
    },
  })
}

export async function listReportSnapshots(principal: AuthenticatedPrincipal) {
  requirePermission(principal, 'report:view')
  return prisma.reportSnapshot.findMany({
    where: { institutionId: principal.institutionId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}
