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
  evaluateOfficialDateFilter,
  isHackathonAchievement,
  isWithinDateWindow,
  resolveActivityDateWithFlag,
  resolveEffectiveActivityDate,
  type DateWindow,
} from './reporting-math'
import {
  certificationResearchPatentStats,
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
  let excludedMissingDateCount = 0
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
    case 'SPORTS_CULTURAL': {
      const catFilter: Prisma.AchievementWhereInput =
        entityType === 'SPORTS_CULTURAL'
          ? { category: { in: ['SPORTS', 'CULTURAL'] } }
          : filters.categoryCode
            ? { OR: [{ categoryCode: filters.categoryCode }, { categoryCode: filters.categoryCode as never }] }
            : {}

      const includeMissing = Boolean(filters.includeMissingActivityDates)
      const baseWhere: Prisma.AchievementWhereInput = {
        institutionId,
        ...verificationWhere,
        ...catFilter,
        ...(filters.participationLevel ? { participationLevel: filters.participationLevel } : {}),
        ...(filters.result ? { status: filters.result as never } : {}),
        studentProfile: {
          ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
          ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
        },
      }
      const dateWhere: Prisma.AchievementWhereInput = includeMissing
        ? {}
        : {
            awardedAt: {
              not: null,
              ...(dateWindow?.from ? { gte: dateWindow.from } : {}),
              ...(dateWindow?.to ? { lte: dateWindow.to } : {}),
            },
          }

      const [rows, missingAwardedCount] = await Promise.all([
        prisma.achievement.findMany({
          where: { ...baseWhere, ...dateWhere },
          include: {
            studentProfile: {
              include: {
                user: { select: { firstName: true, lastName: true } },
                department: { select: { code: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        includeMissing ? Promise.resolve(0) : prisma.achievement.count({ where: { ...baseWhere, awardedAt: null } }),
      ])

      excludedMissingDateCount += missingAwardedCount
      const dateFiltered = includeMissing
        ? rows.filter((r) => {
            const res = evaluateOfficialDateFilter(r.awardedAt, r.createdAt, dateWindow, true)
            return res.included
          })
        : rows
      const uniqueStudents = new Set(dateFiltered.map((r) => r.studentProfileId)).size
      summaryMetrics = [
        { label: 'Activity Records', value: dateFiltered.length },
        { label: 'Unique Students', value: uniqueStudents },
        ...(excludedMissingDateCount > 0 ? [{ label: 'Excluded (Missing Activity Date)', value: excludedMissingDateCount }] : []),
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

    case 'HACKATHONS': {
      const includeMissing = Boolean(filters.includeMissingActivityDates)
      const hackathonBaseWhere: Prisma.AchievementWhereInput = {
        institutionId,
        ...verificationWhere,
        ...(filters.participationLevel ? { participationLevel: filters.participationLevel } : {}),
        OR: [
          { categoryCode: 'HACKATHON' },
          { title: { contains: 'hackathon', mode: 'insensitive' } },
          { description: { contains: 'hackathon', mode: 'insensitive' } },
        ],
        studentProfile: {
          ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
          ...(filters.batchYear ? { admissionYear: filters.batchYear } : {}),
        },
      }
      const hackathonDateWhere: Prisma.AchievementWhereInput = includeMissing
        ? {}
        : {
            awardedAt: {
              not: null,
              ...(dateWindow?.from ? { gte: dateWindow.from } : {}),
              ...(dateWindow?.to ? { lte: dateWindow.to } : {}),
            },
          }
      const [achRows, hackathonEvents] = await Promise.all([
        prisma.achievement.findMany({
          where: { ...hackathonBaseWhere, ...hackathonDateWhere },
          include: {
            studentProfile: {
              include: {
                user: { select: { firstName: true, lastName: true } },
                department: { select: { code: true } },
              },
            },
          },
        }),
        prisma.event.findMany({
          where: {
            institutionId,
            categoryCode: 'HACKATHON',
            ...(deptScopeFilter ? { departmentId: deptScopeFilter } : {}),
            ...(filters.participationLevel ? { level: filters.participationLevel } : {}),
            ...(dateWindow
              ? {
                  startsAt: {
                    ...(dateWindow.from ? { gte: dateWindow.from } : {}),
                    ...(dateWindow.to ? { lte: dateWindow.to } : {}),
                  },
                }
              : {}),
          },
          include: {
            department: { select: { code: true } },
            participation: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    student: { select: { id: true, department: { select: { code: true } } } },
                  },
                },
              },
            },
          },
        }),
      ])

      const externalHackathons = achRows
        .filter((r) => isHackathonAchievement(r))
        .filter((r) => {
          const res = evaluateOfficialDateFilter(r.awardedAt, r.createdAt, dateWindow, includeMissing)
          if (!res.included && res.isMissingActivityDate) excludedMissingDateCount += 1
          return res.included
        })

      const internalHackathons = hackathonEvents.filter((e) =>
        isWithinDateWindow(e.startsAt, dateWindow),
      )

      // Deduplicate: track internal synced achievement IDs / sourceEventIds so we never double-count
      const internalEventIds = new Set(internalHackathons.map((e) => e.id))
      const externalOnly = externalHackathons.filter(
        (a) => !a.sourceEventId || !internalEventIds.has(a.sourceEventId),
      )

      const uniqueStudents = new Set<string>()
      const winningStudents = new Set<string>()
      const winningTeams = new Set<string>()
      let totalRegistrations = 0
      let actualParticipants = 0

      for (const a of externalOnly) {
        uniqueStudents.add(a.studentProfileId)
        actualParticipants += 1
        totalRegistrations += 1
        if (a.status === 'WINNER') {
          winningStudents.add(a.studentProfileId)
          if (a.teamName) winningTeams.add(`${a.title}::${a.teamName}`)
        }
      }

      const internalRows: Array<Record<string, string | number | boolean>> = []
      for (const evt of internalHackathons) {
        for (const p of evt.participation) {
          if (p.registrationStatus === 'CANCELLED') continue
          totalRegistrations += 1
          const isPresent =
            p.registrationStatus === 'CONFIRMED' ||
            p.registrationStatus === 'ATTENDED' ||
            p.attendanceStatus === 'PRESENT'
          if (!isPresent) continue
          actualParticipants += 1
          const stuKey = p.user.student?.id ?? p.userId
          uniqueStudents.add(stuKey)
          if (p.role === 'WINNER') {
            winningStudents.add(stuKey)
            if (p.teamName) winningTeams.add(`${evt.id}::${p.teamName}`)
          }
          internalRows.push({
            title: evt.title,
            studentName: `${p.user.firstName} ${p.user.lastName}`,
            departmentCode: p.user.student?.department?.code ?? evt.department.code,
            teamName: p.teamName ?? 'Individual',
            participationLevel: evt.level,
            status: p.role === 'WINNER' ? 'WINNER' : 'PARTICIPATION',
            activityDate: evt.startsAt.toISOString().slice(0, 10),
            verificationStatus: 'VERIFIED',
          })
        }
      }

      summaryMetrics = [
        { label: 'Hackathon Events', value: internalHackathons.length + new Set(externalOnly.map((a) => a.title)).size },
        { label: 'Registrations', value: totalRegistrations },
        { label: 'Actual Participants', value: actualParticipants },
        { label: 'Unique Students', value: uniqueStudents.size },
        { label: 'Winning Students', value: winningStudents.size },
        { label: 'Winning Teams', value: winningTeams.size },
        ...(excludedMissingDateCount > 0 ? [{ label: 'Excluded (Missing Activity Date)', value: excludedMissingDateCount }] : []),
      ]

      rawRows = [
        ...internalRows,
        ...externalOnly.map((r) => {
          const resolved = resolveActivityDateWithFlag(r.awardedAt, r.createdAt)
          return {
            title: r.title,
            studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`,
            departmentCode: r.studentProfile.department?.code ?? 'Unassigned',
            teamName: r.teamName ?? 'Individual',
            participationLevel: r.participationLevel ?? '—',
            status: r.status,
            activityDate: resolved.isFallbackCreatedAt
              ? `${resolved.date.toISOString().slice(0, 10)} (fallback)`
              : resolved.date.toISOString().slice(0, 10),
            verificationStatus: r.verificationStatus,
          }
        }),
      ]
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
      const dateRange = dateWindow
        ? {
            ...(dateWindow.from ? { gte: dateWindow.from } : {}),
            ...(dateWindow.to ? { lte: dateWindow.to } : {}),
          }
        : null
      const rows = await prisma.studentInternship.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          ...(dateRange
            ? { OR: [{ startDate: dateRange }, { startDate: null, createdAt: dateRange }] }
            : {}),
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
      const dateRange = dateWindow
        ? {
            ...(dateWindow.from ? { gte: dateWindow.from } : {}),
            ...(dateWindow.to ? { lte: dateWindow.to } : {}),
          }
        : null
      const rows = await prisma.studentPlacementOffer.findMany({
        where: {
          institutionId,
          ...verificationWhere,
          ...(dateRange
            ? { OR: [{ offeredAt: dateRange }, { offeredAt: null, createdAt: dateRange }] }
            : {}),
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
          ...(dateWindow
            ? {
                startDate: {
                  ...(dateWindow.from ? { gte: dateWindow.from } : {}),
                  ...(dateWindow.to ? { lte: dateWindow.to } : {}),
                },
              }
            : {}),
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
          ...(dateWindow
            ? {
                startDate: {
                  ...(dateWindow.from ? { gte: dateWindow.from } : {}),
                  ...(dateWindow.to ? { lte: dateWindow.to } : {}),
                },
              }
            : {}),
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

    case 'CERT_RESEARCH_PATENT': {
      const stats = await certificationResearchPatentStats({
        principal,
        departmentId: filters.departmentId ?? null,
        batchYear: filters.batchYear ?? null,
        dateRange:
          filters.dateFrom || filters.dateTo
            ? { from: filters.dateFrom ?? null, to: filters.dateTo ?? null }
            : undefined,
        includeUnverified,
      })
      rawRows = stats.map((r) => ({ ...r }))
      summaryMetrics = [
        { label: 'Total Records', value: stats.reduce((s, r) => s + r.count, 0) },
      ]
      break
    }

    case 'DATA_QUALITY': {
      const [missingEnrollment, missingStudentDept, missingEmployeeId, unverifiedAch, missingEvidenceAch, missingAchDate, missingCertDate] =
        await Promise.all([
          prisma.studentProfile.count({ where: { institutionId, enrollmentNumber: null } }),
          prisma.studentProfile.count({ where: { institutionId, departmentId: null } }),
          prisma.facultyProfile.count({ where: { institutionId, employeeId: null } }),
          prisma.achievement.count({ where: { institutionId, verificationStatus: 'PENDING' } }),
          prisma.achievement.count({ where: { institutionId, documentUrls: { isEmpty: true } } }),
          prisma.achievement.count({ where: { institutionId, awardedAt: null } }),
          prisma.studentCertification.count({ where: { institutionId, issuedAt: null } }),
        ])
      rawRows = [
        { checkName: 'Students missing enrollment number', scope: 'Student Profiles', issueCount: missingEnrollment, severity: missingEnrollment > 0 ? 'HIGH' : 'OK', recommendation: 'Assign enrollment numbers in Admin → Users & Access' },
        { checkName: 'Students missing department assignment', scope: 'Student Profiles', issueCount: missingStudentDept, severity: missingStudentDept > 0 ? 'HIGH' : 'OK', recommendation: 'Assign department in Student Identity' },
        { checkName: 'Faculty missing employee ID', scope: 'Faculty Profiles', issueCount: missingEmployeeId, severity: missingEmployeeId > 0 ? 'MEDIUM' : 'OK', recommendation: 'Assign employee ID in Faculty Identity' },
        { checkName: 'Pending unverified achievements', scope: 'Verification Queue', issueCount: unverifiedAch, severity: unverifiedAch > 0 ? 'MEDIUM' : 'OK', recommendation: 'Review in Admin → Verifications' },
        { checkName: 'Achievements without supporting evidence URLs', scope: 'Evidence Audit', issueCount: missingEvidenceAch, severity: missingEvidenceAch > 0 ? 'MEDIUM' : 'OK', recommendation: 'Request evidence via Data Collection Requests' },
        { checkName: 'Achievements missing actual activity date (awardedAt)', scope: 'Official Date Audit', issueCount: missingAchDate, severity: missingAchDate > 0 ? 'MEDIUM' : 'OK', recommendation: 'Update actual activity dates so records appear in official dated reports' },
        { checkName: 'Student certifications missing issuedAt date', scope: 'Official Date Audit', issueCount: missingCertDate, severity: missingCertDate > 0 ? 'LOW' : 'OK', recommendation: 'Add certificate issue dates' },
      ]
      summaryMetrics = [{ label: 'Total Quality Flags', value: rawRows.reduce((s, r) => s + Number(r.issueCount), 0) }]
      break
    }

    default: {
      const _exhaustive: never = entityType
      throw new Error(`Unsupported report type: ${String(_exhaustive)}`)
    }
  }

  const drillVal = filters.drillDownValue
  const isDrillDown = Boolean(filters.groupBy && drillVal !== undefined && drillVal !== '')
  const drillFilteredRows = isDrillDown
    ? rawRows.filter((row) => String(row[filters.groupBy!] ?? 'Unspecified') === drillVal)
    : rawRows

  const grouped = !isDrillDown ? applyGrouping(rawRows, filters.groupBy) : null
  const effectiveColumns = grouped ? grouped.columns : columns
  const effectiveRows = grouped ? grouped.rows : drillFilteredRows
  const { pagedRows, totalRows, page, pageSize } = applySortAndPaginate(effectiveRows, filters)

  return {
    entityType,
    title: isDrillDown ? `${registry.label} — ${filters.groupBy}: ${drillVal}` : registry.label,
    subtitle: registry.description,
    institutionName: institution?.name ?? 'Attainly Institution',
    countingUnit: registry.countingUnit,
    dateFieldSemantics: registry.dateFieldSemantics,
    verificationScope: filters.includeMissingActivityDates
      ? `${verificationScope} (Provisional: includes missing activity dates)`
      : verificationScope,
    excludedMissingDateCount,
    groupedBy: grouped ? filters.groupBy : undefined,
    drillDownValue: isDrillDown ? drillVal : undefined,
    appliedFilters: {
      ...(ayLabel ? { academicYear: ayLabel } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.batchYear ? { batchYear: String(filters.batchYear) } : {}),
      ...(filters.dateFrom ? { from: filters.dateFrom } : {}),
      ...(filters.dateTo ? { to: filters.dateTo } : {}),
      ...(isDrillDown ? { [`${filters.groupBy}`]: drillVal! } : {}),
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
