import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import { calculateFacultyCompleteness, calculateStudentCompleteness } from '@/lib/completeness'
import { AuthorizationError, requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { Prisma } from '@/generated/prisma/client'
import { getCachedOverview, setCachedOverview } from '../overview-cache'

/**
 * Pure helper enforcing department coordinator isolation.
 * null = institution-wide admin access; string[] = coordinator's assigned department IDs.
 */
export function assertDepartmentAccess(
  allowedDepartmentIds: string[] | null,
  targetDepartmentId: string | null | undefined,
): void {
  if (allowedDepartmentIds === null) return
  if (!targetDepartmentId || !allowedDepartmentIds.includes(targetDepartmentId)) {
    throw new AuthorizationError('You do not have access to records outside your assigned department.')
  }
}

export async function resolveDepartmentScope(principal: AuthenticatedPrincipal): Promise<string[] | null> {
  if (
    principal.permissions.includes('user:manage') ||
    principal.permissions.includes('institution:manage')
  ) {
    return null
  }
  const depts = await prisma.department.findMany({
    where: { institutionId: principal.institutionId, coordinatorUserId: principal.userId },
    select: { id: true },
  })
  return depts.map((d) => d.id)
}

function checkAdminViewPermission(principal: AuthenticatedPrincipal) {
  if (principal.permissions.includes('report:view')) {
    requirePermission(principal, 'report:view')
    return
  }
  requirePermission(principal, 'user:manage')
}

export interface AdminCommandOverview {
  studentCount: number
  facultyCount: number
  departmentCount: number
  courseCount: number
  verifiedRecordsCount: number
  pendingVerificationsCount: number
  overdueVerificationsCount: number
  eventStats: { totalEvents: number; totalParticipations: number }
  studentEngagementCount: number
  researchContributionsCount: number
  placementOutcomes: {
    totalOffers: number
    acceptedOffers: number
    placedOutcomeCount: number
    higherStudiesCount: number
  }
  profileCompleteness: {
    studentAvgPct: number
    facultyAvgPct: number
  }
  missingEvidenceCount: number
}

export async function getAdminCommandOverview(input: {
  principal: AuthenticatedPrincipal
  departmentId?: string | null
  academicYearLabel?: string | null
}): Promise<AdminCommandOverview> {
  checkAdminViewPermission(input.principal)
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)

  if (input.departmentId) {
    assertDepartmentAccess(allowedDepts, input.departmentId)
  }

  const deptIdsParam: string[] | null = input.departmentId
    ? [input.departmentId]
    : allowedDepts !== null
      ? allowedDepts
      : null

  const scopeKey = deptIdsParam ? deptIdsParam.slice().sort().join(',') : 'ALL'
  const cacheKey = `${institutionId}::v2::${scopeKey}::${input.departmentId ?? 'ALL'}::${input.academicYearLabel ?? 'ALL'}`
  const cached = getCachedOverview<AdminCommandOverview>(cacheKey)
  if (cached) return cached

  let dateFrom: Date | null = null
  let dateTo: Date | null = null
  if (input.academicYearLabel) {
    const ay = await prisma.academicYear.findUnique({
      where: { institutionId_label: { institutionId, label: input.academicYearLabel } },
    })
    if (ay) {
      dateFrom = ay.startDate
      dateTo = ay.endDate
    }
  }

  const cutoff7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Consolidated Query 1: All institutional KPIs in a single parameterized SQL aggregate call
  const deptCondStudent = deptIdsParam
    ? Prisma.sql`AND sp."departmentId" = ANY(${deptIdsParam}::text[])`
    : Prisma.empty
  const deptCondFaculty = deptIdsParam
    ? Prisma.sql`AND fp."departmentId" = ANY(${deptIdsParam}::text[])`
    : Prisma.empty
  const deptCondDirect = deptIdsParam
    ? Prisma.sql`AND "departmentId" = ANY(${deptIdsParam}::text[])`
    : Prisma.empty
  const deptCondDeptTable = deptIdsParam
    ? Prisma.sql`AND "id" = ANY(${deptIdsParam}::text[])`
    : Prisma.empty
  const dateCondCreated =
    dateFrom && dateTo
      ? Prisma.sql`AND t."createdAt" >= ${dateFrom} AND t."createdAt" <= ${dateTo}`
      : Prisma.empty
  const dateCondEvent =
    dateFrom && dateTo
      ? Prisma.sql`AND e."startsAt" >= ${dateFrom} AND e."startsAt" <= ${dateTo}`
      : Prisma.empty

  const [kpiRow] = await prisma.$queryRaw<
    Array<{
      student_count: number
      faculty_count: number
      department_count: number
      course_count: number
      total_events: number
      total_participations: number
      verified_count: number
      pending_count: number
      overdue_count: number
      research_verified_count: number
      student_engagement_count: number
      total_offers: number
      accepted_offers: number
      placed_outcome_count: number
      higher_studies_count: number
      missing_evidence_count: number
    }>
  >`
    SELECT
      (SELECT COUNT(*)::int FROM "StudentProfile" sp WHERE sp.institution_id = ${institutionId} ${deptCondStudent}) AS student_count,
      (SELECT COUNT(*)::int FROM "FacultyProfile" fp WHERE fp.institution_id = ${institutionId} ${deptCondFaculty}) AS faculty_count,
      (SELECT COUNT(*)::int FROM "Department" WHERE institution_id = ${institutionId} ${deptCondDeptTable}) AS department_count,
      (SELECT COUNT(*)::int FROM "Course" WHERE institution_id = ${institutionId} ${deptCondDirect}) AS course_count,
      (SELECT COUNT(*)::int FROM "Event" e WHERE e.institution_id = ${institutionId} ${deptIdsParam ? Prisma.sql`AND e."departmentId" = ANY(${deptIdsParam}::text[])` : Prisma.empty} ${dateCondEvent}) AS total_events,
      (SELECT COUNT(*)::int FROM "EventParticipation" ep JOIN "Event" e ON e.institution_id = ep.institution_id AND e.id = ep."eventId" WHERE ep.institution_id = ${institutionId} ${deptIdsParam ? Prisma.sql`AND e."departmentId" = ANY(${deptIdsParam}::text[])` : Prisma.empty} ${dateCondEvent}) AS total_participations,
      (
        (SELECT COUNT(*)::int FROM "Achievement" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentCertification" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentResearchPaper" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentPatent" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentInternship" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentPlacementOffer" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyDevelopmentProgram" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondFaculty} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "CanonicalPublication" t WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyResearchGrant" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondFaculty} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyConsultancy" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondFaculty} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyPatent" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondFaculty} ${dateCondCreated})
      ) AS verified_count,
      (
        (SELECT COUNT(*)::int FROM "Achievement" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentCertification" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentResearchPaper" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentPatent" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentInternship" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyDevelopmentProgram" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondFaculty} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "CanonicalPublication" t WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyResearchGrant" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondFaculty} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyConsultancy" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' ${deptCondFaculty} ${dateCondCreated})
      ) AS pending_count,
      (
        (SELECT COUNT(*)::int FROM "Achievement" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' AND t."createdAt" < ${cutoff7Days} ${deptCondStudent}) +
        (SELECT COUNT(*)::int FROM "StudentCertification" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' AND t."createdAt" < ${cutoff7Days} ${deptCondStudent}) +
        (SELECT COUNT(*)::int FROM "FacultyDevelopmentProgram" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' AND t."createdAt" < ${cutoff7Days} ${deptCondFaculty}) +
        (SELECT COUNT(*)::int FROM "CanonicalPublication" t WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'PENDING' AND t."createdAt" < ${cutoff7Days})
      ) AS overdue_count,
      (
        (SELECT COUNT(*)::int FROM "StudentResearchPaper" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "StudentPatent" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondStudent} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "CanonicalPublication" t WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyResearchGrant" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondFaculty} ${dateCondCreated}) +
        (SELECT COUNT(*)::int FROM "FacultyPatent" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."verificationStatus" = 'VERIFIED' ${deptCondFaculty} ${dateCondCreated})
      ) AS research_verified_count,
      (SELECT COUNT(*)::int FROM "StudentProfile" sp WHERE sp.institution_id = ${institutionId} ${deptCondStudent} AND (
        EXISTS (SELECT 1 FROM "Achievement" a WHERE a.institution_id = sp.institution_id AND a."studentProfileId" = sp.id) OR
        EXISTS (SELECT 1 FROM "StudentCertification" c WHERE c.institution_id = sp.institution_id AND c."studentProfileId" = sp.id) OR
        EXISTS (SELECT 1 FROM "StudentProject" p WHERE p.institution_id = sp.institution_id AND p."studentProfileId" = sp.id) OR
        EXISTS (SELECT 1 FROM "EventParticipation" ep WHERE ep.institution_id = sp.institution_id AND ep."userId" = sp."userId")
      )) AS student_engagement_count,
      (SELECT COUNT(*)::int FROM "StudentPlacementOffer" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} ${deptCondStudent} ${dateCondCreated}) AS total_offers,
      (SELECT COUNT(*)::int FROM "StudentPlacementOffer" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t.status = 'ACCEPTED' ${deptCondStudent} ${dateCondCreated}) AS accepted_offers,
      (SELECT COUNT(*)::int FROM "StudentGraduateOutcome" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."outcomeType" = 'PLACED' ${deptCondStudent}) AS placed_outcome_count,
      (SELECT COUNT(*)::int FROM "StudentGraduateOutcome" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."outcomeType" = 'HIGHER_STUDIES' ${deptCondStudent}) AS higher_studies_count,
      (
        (SELECT COUNT(*)::int FROM "StudentCertification" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."fileUrl" IS NULL ${deptCondStudent}) +
        (SELECT COUNT(*)::int FROM "StudentResearchPaper" t JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId" WHERE t.institution_id = ${institutionId} AND t."fileUrl" IS NULL ${deptCondStudent}) +
        (SELECT COUNT(*)::int FROM "FacultyDevelopmentProgram" t JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId" WHERE t.institution_id = ${institutionId} AND t."documentUrl" IS NULL ${deptCondFaculty}) +
        (SELECT COUNT(*)::int FROM "CanonicalPublication" t WHERE t.institution_id = ${institutionId} AND t."fileUrl" IS NULL)
      ) AS missing_evidence_count
  `

  // Consolidated Query 2: Bounded completeness sample (up to 500 latest profiles) to avoid full 5k-row transfer
  const studentScope: Prisma.StudentProfileWhereInput = {
    institutionId,
    ...(deptIdsParam ? { departmentId: { in: deptIdsParam } } : {}),
  }
  const facultyScope: Prisma.FacultyProfileWhereInput = {
    institutionId,
    ...(deptIdsParam ? { departmentId: { in: deptIdsParam } } : {}),
  }

  const [studentCompletenessRows, facultyCompletenessRows] = await Promise.all([
    prisma.studentProfile.findMany({
      where: studentScope,
      take: 250,
      orderBy: { updatedAt: 'desc' },
      select: {
        phone: true,
        enrollmentNumber: true,
        departmentId: true,
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
    prisma.facultyProfile.findMany({
      where: facultyScope,
      take: 250,
      orderBy: { updatedAt: 'desc' },
      select: {
        phone: true,
        office: true,
        linkedinUrl: true,
        orcidId: true,
        employeeId: true,
        departmentId: true,
        _count: {
          select: {
            education: true,
            experiences: true,
            certifications: true,
            researchPapers: true,
            patents: true,
            developmentPrograms: true,
            teachingLoads: true,
            publicationLinks: true,
            researchGrants: true,
            consultancies: true,
            contributions: true,
          },
        },
      },
    }),
  ])

  const studentAvgPct =
    studentCompletenessRows.length > 0
      ? Math.round(
          studentCompletenessRows.reduce(
            (sum, s) =>
              sum +
              calculateStudentCompleteness({
                hasPersonalInfo: Boolean(s.phone),
                hasInstitutionalIdentity: Boolean(s.enrollmentNumber && s.departmentId),
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
              }).percentage,
            0,
          ) / studentCompletenessRows.length,
        )
      : 0

  const facultyAvgPct =
    facultyCompletenessRows.length > 0
      ? Math.round(
          facultyCompletenessRows.reduce(
            (sum, f) =>
              sum +
              calculateFacultyCompleteness({
                hasPersonalInfo: Boolean(f.phone || f.office || f.linkedinUrl || f.orcidId),
                hasInstitutionalIdentity: Boolean(f.employeeId && f.departmentId),
                educationCount: f._count.education,
                experienceCount: f._count.experiences,
                certificationCount: f._count.certifications,
                researchPaperCount: f._count.researchPapers,
                patentCount: f._count.patents,
                fdpCount: f._count.developmentPrograms,
                teachingLoadCount: f._count.teachingLoads,
                canonicalPublicationCount: f._count.publicationLinks,
                grantCount: f._count.researchGrants,
                consultancyCount: f._count.consultancies,
                contributionCount: f._count.contributions,
              }).percentage,
            0,
          ) / facultyCompletenessRows.length,
        )
      : 0

  const overview: AdminCommandOverview = {
    studentCount: kpiRow?.student_count ?? 0,
    facultyCount: kpiRow?.faculty_count ?? 0,
    departmentCount: kpiRow?.department_count ?? 0,
    courseCount: kpiRow?.course_count ?? 0,
    verifiedRecordsCount: kpiRow?.verified_count ?? 0,
    pendingVerificationsCount: kpiRow?.pending_count ?? 0,
    overdueVerificationsCount: kpiRow?.overdue_count ?? 0,
    eventStats: {
      totalEvents: kpiRow?.total_events ?? 0,
      totalParticipations: kpiRow?.total_participations ?? 0,
    },
    studentEngagementCount: kpiRow?.student_engagement_count ?? 0,
    researchContributionsCount: kpiRow?.research_verified_count ?? 0,
    placementOutcomes: {
      totalOffers: kpiRow?.total_offers ?? 0,
      acceptedOffers: kpiRow?.accepted_offers ?? 0,
      placedOutcomeCount: kpiRow?.placed_outcome_count ?? 0,
      higherStudiesCount: kpiRow?.higher_studies_count ?? 0,
    },
    profileCompleteness: { studentAvgPct, facultyAvgPct },
    missingEvidenceCount: kpiRow?.missing_evidence_count ?? 0,
  }

  setCachedOverview(cacheKey, overview, 30_000)
  return overview
}

export interface StudentDirectoryItem {
  userId: string
  name: string
  email: string
  isActive: boolean
  enrollmentNumber: string | null
  departmentName: string | null
  courseName: string | null
  admissionYear: number | null
  currentSemester: number | null
  academicStatus: string
  placementOffersCount: number
  graduateOutcomeType: string | null
  completenessPercentage: number
}

export async function listAdminStudentsDirectory(input: {
  principal: AuthenticatedPrincipal
  q?: string
  departmentId?: string
  courseId?: string
  batchYear?: number
  semester?: number
  enrollmentNumber?: string
  academicStatus?: string
  placementStatus?: string
  completenessBand?: string
  sortBy?: 'name' | 'enrollmentNumber' | 'admissionYear'
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}): Promise<{ items: StudentDirectoryItem[]; total: number; page: number; pageSize: number }> {
  checkAdminViewPermission(input.principal)
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)
  if (input.departmentId) assertDepartmentAccess(allowedDepts, input.departmentId)

  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 15))
  const q = input.q?.trim()

  const where: Prisma.StudentProfileWhereInput = {
    institutionId,
    ...(input.departmentId
      ? { departmentId: input.departmentId }
      : allowedDepts !== null
        ? { departmentId: { in: allowedDepts } }
        : {}),
    ...(input.courseId ? { courseId: input.courseId } : {}),
    ...(input.batchYear ? { admissionYear: input.batchYear } : {}),
    ...(input.semester ? { currentSemester: input.semester } : {}),
    ...(input.enrollmentNumber
      ? { enrollmentNumber: { contains: input.enrollmentNumber.trim(), mode: 'insensitive' } }
      : {}),
    ...(input.academicStatus ? { academicStatus: input.academicStatus as any } : {}),
    ...(input.placementStatus === 'PLACED'
      ? { OR: [{ placementOffers: { some: { status: 'ACCEPTED' } } }, { graduateOutcome: { outcomeType: 'PLACED' } }] }
      : input.placementStatus === 'HAS_OFFERS'
        ? { placementOffers: { some: {} } }
        : input.placementStatus === 'NO_OFFERS'
          ? { placementOffers: { none: {} } }
          : {}),
    ...(q
      ? {
          OR: [
            { enrollmentNumber: { contains: q, mode: 'insensitive' } },
            { user: { firstName: { contains: q, mode: 'insensitive' } } },
            { user: { lastName: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const orderBy: Prisma.StudentProfileOrderByWithRelationInput =
    input.sortBy === 'enrollmentNumber'
      ? { enrollmentNumber: input.sortDir ?? 'asc' }
      : input.sortBy === 'admissionYear'
        ? { admissionYear: input.sortDir ?? 'desc' }
        : { user: { firstName: input.sortDir ?? 'asc' } }

  const rows = await prisma.studentProfile.findMany({
    where,
    orderBy,
    select: {
      phone: true,
      enrollmentNumber: true,
      departmentId: true,
      admissionYear: true,
      currentSemester: true,
      academicStatus: true,
      department: { select: { name: true } },
      course: { select: { name: true } },
      graduateOutcome: { select: { outcomeType: true } },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
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
          placementOffers: true,
        },
      },
    },
  })

  let mapped: StudentDirectoryItem[] = rows.map((r) => {
    const comp = calculateStudentCompleteness({
      hasPersonalInfo: Boolean(r.phone),
      hasInstitutionalIdentity: Boolean(r.enrollmentNumber && r.departmentId),
      educationCount: r._count.education,
      semesterCount: r._count.semesterRecords,
      achievementCount: r._count.achievements,
      participationCount: r.user._count.eventEntries,
      certificationCount: r._count.certifications,
      researchPaperCount: r._count.researchPapers,
      patentCount: r._count.patents,
      projectCount: r._count.projects,
      internshipCount: r._count.internships,
      skillCount: r._count.skills,
    })
    return {
      userId: r.user.id,
      name: `${r.user.firstName} ${r.user.lastName}`.trim(),
      email: r.user.email,
      isActive: r.user.isActive,
      enrollmentNumber: r.enrollmentNumber,
      departmentName: r.department?.name ?? null,
      courseName: r.course?.name ?? null,
      admissionYear: r.admissionYear,
      currentSemester: r.currentSemester,
      academicStatus: r.academicStatus,
      placementOffersCount: r._count.placementOffers,
      graduateOutcomeType: r.graduateOutcome?.outcomeType ?? null,
      completenessPercentage: comp.percentage,
    }
  })

  if (input.completenessBand === 'below50') {
    mapped = mapped.filter((m) => m.completenessPercentage < 50)
  } else if (input.completenessBand === '50to80') {
    mapped = mapped.filter((m) => m.completenessPercentage >= 50 && m.completenessPercentage <= 80)
  } else if (input.completenessBand === 'above80') {
    mapped = mapped.filter((m) => m.completenessPercentage > 80)
  }

  const total = mapped.length
  const items = mapped.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize }
}

export async function getAdminStudentDossier(input: {
  principal: AuthenticatedPrincipal
  userId: string
}) {
  checkAdminViewPermission(input.principal)
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)

  const profile = await prisma.studentProfile.findUnique({
    where: { institutionId_userId: { institutionId, userId: input.userId } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true, createdAt: true } },
      department: true,
      course: true,
      education: { orderBy: { endYear: 'desc' } },
      semesterRecords: { orderBy: { semesterNumber: 'asc' } },
      achievements: { orderBy: { createdAt: 'desc' } },
      certifications: { orderBy: { createdAt: 'desc' } },
      researchPapers: { orderBy: { createdAt: 'desc' } },
      patents: { orderBy: { createdAt: 'desc' } },
      projects: { orderBy: { createdAt: 'desc' } },
      internships: { orderBy: { createdAt: 'desc' } },
      skills: { orderBy: { skillName: 'asc' } },
      placementOffers: { orderBy: { createdAt: 'desc' } },
      graduateOutcome: true,
    },
  })

  if (!profile) throw new Error('Student profile not found.')
  assertDepartmentAccess(allowedDepts, profile.departmentId)

  const [participations, documents] = await Promise.all([
    prisma.eventParticipation.findMany({
      where: { institutionId, userId: input.userId },
      include: { event: { include: { department: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.findMany({
      where: { institutionId, ownerUserId: input.userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { profile, participations, documents }
}

export interface FacultyDirectoryItem {
  userId: string
  name: string
  email: string
  isActive: boolean
  employeeId: string | null
  departmentName: string | null
  designation: string | null
  employmentStatus: string
  highestQualification: string | null
  experienceCount: number
  publicationsCount: number
  contributionsCount: number
  completenessPercentage: number
}

export async function listAdminFacultyDirectory(input: {
  principal: AuthenticatedPrincipal
  q?: string
  departmentId?: string
  employeeId?: string
  designation?: string
  qualification?: string
  employmentStatus?: string
  minExperience?: number
  hasContributions?: boolean
  sortBy?: 'name' | 'employeeId' | 'designation'
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}): Promise<{ items: FacultyDirectoryItem[]; total: number; page: number; pageSize: number }> {
  checkAdminViewPermission(input.principal)
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)
  if (input.departmentId) assertDepartmentAccess(allowedDepts, input.departmentId)

  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 15))
  const q = input.q?.trim()

  const where: Prisma.FacultyProfileWhereInput = {
    institutionId,
    ...(input.departmentId
      ? { departmentId: input.departmentId }
      : allowedDepts !== null
        ? { departmentId: { in: allowedDepts } }
        : {}),
    ...(input.employeeId ? { employeeId: { contains: input.employeeId.trim(), mode: 'insensitive' } } : {}),
    ...(input.designation ? { designation: { contains: input.designation.trim(), mode: 'insensitive' } } : {}),
    ...(input.employmentStatus ? { employmentStatus: input.employmentStatus as any } : {}),
    ...(input.qualification
      ? { education: { some: { qualification: { contains: input.qualification.trim(), mode: 'insensitive' } } } }
      : {}),
    ...(input.hasContributions ? { contributions: { some: {} } } : {}),
    ...(q
      ? {
          OR: [
            { employeeId: { contains: q, mode: 'insensitive' } },
            { designation: { contains: q, mode: 'insensitive' } },
            { specialization: { contains: q, mode: 'insensitive' } },
            { user: { firstName: { contains: q, mode: 'insensitive' } } },
            { user: { lastName: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const orderBy: Prisma.FacultyProfileOrderByWithRelationInput =
    input.sortBy === 'employeeId'
      ? { employeeId: input.sortDir ?? 'asc' }
      : input.sortBy === 'designation'
        ? { designation: input.sortDir ?? 'asc' }
        : { user: { firstName: input.sortDir ?? 'asc' } }

  const rows = await prisma.facultyProfile.findMany({
    where,
    orderBy,
    select: {
      employeeId: true,
      departmentId: true,
      designation: true,
      employmentStatus: true,
      phone: true,
      office: true,
      linkedinUrl: true,
      orcidId: true,
      department: { select: { name: true } },
      education: { orderBy: { yearCompleted: 'desc' }, take: 1, select: { qualification: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
      _count: {
        select: {
          education: true,
          experiences: true,
          certifications: true,
          researchPapers: true,
          patents: true,
          developmentPrograms: true,
          teachingLoads: true,
          publicationLinks: true,
          researchGrants: true,
          consultancies: true,
          contributions: true,
        },
      },
    },
  })

  let mapped: FacultyDirectoryItem[] = rows.map((f) => {
    const comp = calculateFacultyCompleteness({
      hasPersonalInfo: Boolean(f.phone || f.office || f.linkedinUrl || f.orcidId),
      hasInstitutionalIdentity: Boolean(f.employeeId && f.departmentId),
      educationCount: f._count.education,
      experienceCount: f._count.experiences,
      certificationCount: f._count.certifications,
      researchPaperCount: f._count.researchPapers,
      patentCount: f._count.patents,
      fdpCount: f._count.developmentPrograms,
      teachingLoadCount: f._count.teachingLoads,
      canonicalPublicationCount: f._count.publicationLinks,
      grantCount: f._count.researchGrants,
      consultancyCount: f._count.consultancies,
      contributionCount: f._count.contributions,
    })

    return {
      userId: f.user.id,
      name: `${f.user.firstName} ${f.user.lastName}`.trim(),
      email: f.user.email,
      isActive: f.user.isActive,
      employeeId: f.employeeId,
      departmentName: f.department?.name ?? null,
      designation: f.designation,
      employmentStatus: f.employmentStatus,
      highestQualification: f.education[0]?.qualification ?? null,
      experienceCount: f._count.experiences,
      publicationsCount: f._count.publicationLinks + f._count.researchPapers,
      contributionsCount: f._count.contributions,
      completenessPercentage: comp.percentage,
    }
  })

  if (typeof input.minExperience === 'number' && input.minExperience > 0) {
    mapped = mapped.filter((m) => m.experienceCount >= input.minExperience!)
  }

  const total = mapped.length
  const items = mapped.slice((page - 1) * pageSize, page * pageSize)
  return { items, total, page, pageSize }
}

export async function getAdminFacultyPortfolio(input: {
  principal: AuthenticatedPrincipal
  userId: string
}) {
  checkAdminViewPermission(input.principal)
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)

  const profile = await prisma.facultyProfile.findUnique({
    where: { institutionId_userId: { institutionId, userId: input.userId } },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true, createdAt: true } },
      department: true,
      education: { orderBy: { yearCompleted: 'desc' } },
      experiences: { orderBy: { startDate: 'desc' } },
      teachingLoads: { orderBy: [{ academicYear: 'desc' }, { semester: 'asc' }] },
      developmentPrograms: { orderBy: { startDate: 'desc' } },
      certifications: { orderBy: { createdAt: 'desc' } },
      researchPapers: { orderBy: { createdAt: 'desc' } },
      patents: { orderBy: { createdAt: 'desc' } },
      researchGrants: { orderBy: { createdAt: 'desc' } },
      consultancies: { orderBy: { startDate: 'desc' } },
      contributions: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!profile) throw new Error('Faculty profile not found.')
  assertDepartmentAccess(allowedDepts, profile.departmentId)

  const [canonicalPublications, documents] = await Promise.all([
    prisma.canonicalPublication.findMany({
      where: {
        institutionId,
        contributors: { some: { facultyProfileId: profile.id } },
      },
      include: {
        contributors: {
          include: {
            facultyProfile: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          },
          orderBy: { authorOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.findMany({
      where: { institutionId, ownerUserId: input.userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return { profile, canonicalPublications, documents }
}

// ---------------- Academic Years, Batches & Department Coordinators ----------------
const academicYearSchema = z
  .object({
    label: z.string().trim().min(4).max(30),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isCurrent: z.boolean().default(false),
  })
  .refine((v) => v.endDate >= v.startDate, { message: 'End date cannot be earlier than start date.', path: ['endDate'] })

const batchSchema = z.object({
  name: z.string().trim().min(2).max(60),
  admissionYear: z.coerce.number().int().min(1990).max(2100),
  departmentId: z.string().trim().nullable().optional(),
  courseId: z.string().trim().nullable().optional(),
})

export async function listAcademicYears(principal: AuthenticatedPrincipal) {
  checkAdminViewPermission(principal)
  return prisma.academicYear.findMany({
    where: { institutionId: principal.institutionId },
    orderBy: { startDate: 'desc' },
  })
}

export async function createAcademicYear(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'institution:manage')
  const data = academicYearSchema.parse(raw)
  if (data.isCurrent) {
    await prisma.academicYear.updateMany({
      where: { institutionId: principal.institutionId, isCurrent: true },
      data: { isCurrent: false },
    })
  }
  return prisma.academicYear.create({
    data: { institutionId: principal.institutionId, ...data },
  })
}

export async function listBatches(principal: AuthenticatedPrincipal) {
  checkAdminViewPermission(principal)
  return prisma.batch.findMany({
    where: { institutionId: principal.institutionId },
    orderBy: { admissionYear: 'desc' },
  })
}

export async function createBatch(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'institution:manage')
  const data = batchSchema.parse(raw)
  return prisma.batch.create({
    data: { institutionId: principal.institutionId, ...data },
  })
}

export async function assignDepartmentCoordinator(
  principal: AuthenticatedPrincipal,
  departmentId: string,
  coordinatorUserId: string | null,
) {
  requirePermission(principal, 'department:manage')
  const { institutionId } = principal
  const dept = await prisma.department.findUnique({
    where: { institutionId_id: { institutionId, id: departmentId } },
  })
  if (!dept) throw new Error('Department not found.')

  if (coordinatorUserId) {
    const user = await prisma.user.findUnique({
      where: { institutionId_id: { institutionId, id: coordinatorUserId } },
    })
    if (!user || !user.isActive) throw new Error('Selected coordinator user is invalid or inactive.')
  }

  return prisma.department.update({
    where: { institutionId_id: { institutionId, id: departmentId } },
    data: { coordinatorUserId },
  })
}
