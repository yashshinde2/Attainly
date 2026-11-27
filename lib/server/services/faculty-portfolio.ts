import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import { calculateFacultyCompleteness, type CompletenessResult } from '@/lib/completeness'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { PrismaDocumentRepository } from '../repositories/document-repository'
import {
  PrismaFacultyPortfolioRepository,
  type CanonicalPublicationWithContributors,
} from '../repositories/faculty-portfolio-repository'

const documentRepository = new PrismaDocumentRepository()
const portfolioRepository = new PrismaFacultyPortfolioRepository()

function checkPerm(principal: AuthenticatedPrincipal, specific: string, fallback: string) {
  const perm = principal.permissions.includes(specific) ? specific : fallback
  requirePermission(principal, perm)
}

export const fdpSchema = z
  .object({
    programType: z.enum(['FDP', 'STTP', 'WORKSHOP', 'SEMINAR', 'CONFERENCE', 'TRAINING']).default('FDP'),
    title: z.string().trim().min(1).max(200),
    organizer: z.string().trim().min(1).max(200),
    mode: z.enum(['ONLINE', 'OFFLINE', 'HYBRID']).default('ONLINE'),
    durationDays: z.coerce.number().int().min(1).max(365).nullable().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    documentUrl: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date cannot be earlier than start date.',
    path: ['endDate'],
  })

export const teachingLoadSchema = z.object({
  academicYear: z.string().trim().min(4).max(30),
  semester: z.coerce.number().int().min(1).max(12),
  subjectName: z.string().trim().min(1).max(180),
  subjectCode: z.string().trim().max(40).nullable().optional(),
  hoursPerWeek: z.coerce.number().int().min(1).max(60),
  studentCount: z.coerce.number().int().min(0).max(2000).nullable().optional(),
})

export const canonicalPublicationSchema = z.object({
  title: z.string().trim().min(1).max(300),
  publicationType: z.enum(['JOURNAL', 'CONFERENCE', 'BOOK', 'BOOK_CHAPTER']).default('JOURNAL'),
  journalOrConference: z.string().trim().max(250).nullable().optional(),
  publisher: z.string().trim().max(200).nullable().optional(),
  doi: z.string().trim().max(150).nullable().optional(),
  issnOrIsbn: z.string().trim().max(100).nullable().optional(),
  indexing: z.string().trim().max(100).nullable().optional(),
  authorsText: z.string().trim().max(500).nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  authorOrder: z.coerce.number().int().min(1).max(50).default(1),
  authorRole: z.string().trim().max(60).nullable().optional(),
})

export const researchGrantSchema = z
  .object({
    title: z.string().trim().min(1).max(250),
    fundingAgency: z.string().trim().min(1).max(200),
    grantNumber: z.string().trim().max(100).nullable().optional(),
    amount: z.string().trim().max(80).nullable().optional(),
    role: z.enum(['PI', 'CO_PI']).default('PI'),
    status: z.enum(['ONGOING', 'COMPLETED', 'SUBMITTED']).default('ONGOING'),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    documentUrl: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: 'End date cannot be earlier than start date.',
    path: ['endDate'],
  })

export const consultancySchema = z
  .object({
    title: z.string().trim().min(1).max(250),
    clientOrganization: z.string().trim().min(1).max(200),
    role: z.string().trim().max(120).nullable().optional(),
    amount: z.string().trim().max(80).nullable().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    outcomes: z.string().trim().max(1000).nullable().optional(),
    documentUrl: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: 'End date cannot be earlier than start date.',
    path: ['endDate'],
  })

export const contributionSchema = z
  .object({
    contributionType: z.enum([
      'MEMBERSHIP',
      'AWARD',
      'MENTORSHIP',
      'ADMIN_RESPONSIBILITY',
      'COMMITTEE',
      'INDUSTRY_COLLABORATION',
      'SOCIAL_CONTRIBUTION',
    ]),
    title: z.string().trim().min(1).max(200),
    organizationOrBody: z.string().trim().max(200).nullable().optional(),
    role: z.string().trim().max(120).nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    documentUrl: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
    message: 'End date cannot be earlier than start date.',
    path: ['endDate'],
  })

// FDP
export async function listOwnFdps(principal: AuthenticatedPrincipal) {
  checkPerm(principal, 'faculty_fdp:read_own', 'faculty_profile:read_own')
  return portfolioRepository.listFdps({ institutionId: principal.institutionId, userId: principal.userId })
}

export async function addOwnFdp(principal: AuthenticatedPrincipal, raw: unknown) {
  checkPerm(principal, 'faculty_fdp:edit_own', 'faculty_profile:edit_own')
  const data = fdpSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.createFdp({ institutionId: principal.institutionId, userId: principal.userId, data })
}

export async function updateOwnFdp(principal: AuthenticatedPrincipal, id: string, raw: unknown) {
  checkPerm(principal, 'faculty_fdp:edit_own', 'faculty_profile:edit_own')
  const data = fdpSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.updateFdp({ institutionId: principal.institutionId, userId: principal.userId, id, data })
}

export async function deleteOwnFdp(principal: AuthenticatedPrincipal, id: string) {
  checkPerm(principal, 'faculty_fdp:delete_own', 'faculty_profile:edit_own')
  return portfolioRepository.deleteFdp({ institutionId: principal.institutionId, userId: principal.userId, id })
}

// Teaching Load
export async function listOwnTeachingLoads(principal: AuthenticatedPrincipal) {
  checkPerm(principal, 'faculty_teaching:read_own', 'faculty_profile:read_own')
  return portfolioRepository.listTeachingLoads({ institutionId: principal.institutionId, userId: principal.userId })
}

export async function addOwnTeachingLoad(principal: AuthenticatedPrincipal, raw: unknown) {
  checkPerm(principal, 'faculty_teaching:edit_own', 'faculty_profile:edit_own')
  const data = teachingLoadSchema.parse(raw)
  return portfolioRepository.createTeachingLoad({ institutionId: principal.institutionId, userId: principal.userId, data })
}

export async function updateOwnTeachingLoad(principal: AuthenticatedPrincipal, id: string, raw: unknown) {
  checkPerm(principal, 'faculty_teaching:edit_own', 'faculty_profile:edit_own')
  const data = teachingLoadSchema.parse(raw)
  return portfolioRepository.updateTeachingLoad({ institutionId: principal.institutionId, userId: principal.userId, id, data })
}

export async function deleteOwnTeachingLoad(principal: AuthenticatedPrincipal, id: string) {
  checkPerm(principal, 'faculty_teaching:delete_own', 'faculty_profile:edit_own')
  return portfolioRepository.deleteTeachingLoad({ institutionId: principal.institutionId, userId: principal.userId, id })
}

// Canonical Publications
export async function listOwnCanonicalPublications(
  principal: AuthenticatedPrincipal,
): Promise<CanonicalPublicationWithContributors[]> {
  checkPerm(principal, 'faculty_research:read_own', 'faculty_profile:read_own')
  return portfolioRepository.listCanonicalPublications({ institutionId: principal.institutionId, userId: principal.userId })
}

export async function addOwnCanonicalPublication(principal: AuthenticatedPrincipal, raw: unknown) {
  checkPerm(principal, 'faculty_research:edit_own', 'faculty_profile:edit_own')
  const parsed = canonicalPublicationSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: parsed.fileUrl,
  })
  const { authorOrder, authorRole, ...data } = parsed
  return portfolioRepository.createOrLinkCanonicalPublication({
    institutionId: principal.institutionId,
    userId: principal.userId,
    authorOrder,
    authorRole,
    data,
  })
}

export async function updateOwnCanonicalPublication(principal: AuthenticatedPrincipal, id: string, raw: unknown) {
  checkPerm(principal, 'faculty_research:edit_own', 'faculty_profile:edit_own')
  const parsed = canonicalPublicationSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: parsed.fileUrl,
  })
  const { authorOrder: _o, authorRole: _r, ...data } = parsed
  return portfolioRepository.updateCanonicalPublication({
    institutionId: principal.institutionId,
    userId: principal.userId,
    id,
    data,
  })
}

export async function deleteOwnCanonicalPublication(principal: AuthenticatedPrincipal, id: string) {
  checkPerm(principal, 'faculty_research:delete_own', 'faculty_profile:edit_own')
  return portfolioRepository.unlinkOrDeleteCanonicalPublication({
    institutionId: principal.institutionId,
    userId: principal.userId,
    id,
  })
}

// Grants
export async function listOwnGrants(principal: AuthenticatedPrincipal) {
  checkPerm(principal, 'faculty_grant:read_own', 'faculty_profile:read_own')
  return portfolioRepository.listGrants({ institutionId: principal.institutionId, userId: principal.userId })
}

export async function addOwnGrant(principal: AuthenticatedPrincipal, raw: unknown) {
  checkPerm(principal, 'faculty_grant:edit_own', 'faculty_profile:edit_own')
  const data = researchGrantSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.createGrant({ institutionId: principal.institutionId, userId: principal.userId, data })
}

export async function updateOwnGrant(principal: AuthenticatedPrincipal, id: string, raw: unknown) {
  checkPerm(principal, 'faculty_grant:edit_own', 'faculty_profile:edit_own')
  const data = researchGrantSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.updateGrant({ institutionId: principal.institutionId, userId: principal.userId, id, data })
}

export async function deleteOwnGrant(principal: AuthenticatedPrincipal, id: string) {
  checkPerm(principal, 'faculty_grant:delete_own', 'faculty_profile:edit_own')
  return portfolioRepository.deleteGrant({ institutionId: principal.institutionId, userId: principal.userId, id })
}

// Consultancy
export async function listOwnConsultancies(principal: AuthenticatedPrincipal) {
  checkPerm(principal, 'faculty_consultancy:read_own', 'faculty_profile:read_own')
  return portfolioRepository.listConsultancies({ institutionId: principal.institutionId, userId: principal.userId })
}

export async function addOwnConsultancy(principal: AuthenticatedPrincipal, raw: unknown) {
  checkPerm(principal, 'faculty_consultancy:edit_own', 'faculty_profile:edit_own')
  const data = consultancySchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.createConsultancy({ institutionId: principal.institutionId, userId: principal.userId, data })
}

export async function updateOwnConsultancy(principal: AuthenticatedPrincipal, id: string, raw: unknown) {
  checkPerm(principal, 'faculty_consultancy:edit_own', 'faculty_profile:edit_own')
  const data = consultancySchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.updateConsultancy({ institutionId: principal.institutionId, userId: principal.userId, id, data })
}

export async function deleteOwnConsultancy(principal: AuthenticatedPrincipal, id: string) {
  checkPerm(principal, 'faculty_consultancy:delete_own', 'faculty_profile:edit_own')
  return portfolioRepository.deleteConsultancy({ institutionId: principal.institutionId, userId: principal.userId, id })
}

// Contributions
export async function listOwnContributions(principal: AuthenticatedPrincipal) {
  checkPerm(principal, 'faculty_contribution:read_own', 'faculty_profile:read_own')
  return portfolioRepository.listContributions({ institutionId: principal.institutionId, userId: principal.userId })
}

export async function addOwnContribution(principal: AuthenticatedPrincipal, raw: unknown) {
  checkPerm(principal, 'faculty_contribution:edit_own', 'faculty_profile:edit_own')
  const data = contributionSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.createContribution({ institutionId: principal.institutionId, userId: principal.userId, data })
}

export async function updateOwnContribution(principal: AuthenticatedPrincipal, id: string, raw: unknown) {
  checkPerm(principal, 'faculty_contribution:edit_own', 'faculty_profile:edit_own')
  const data = contributionSchema.parse(raw)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    fileUrl: data.documentUrl,
  })
  return portfolioRepository.updateContribution({ institutionId: principal.institutionId, userId: principal.userId, id, data })
}

export async function deleteOwnContribution(principal: AuthenticatedPrincipal, id: string) {
  checkPerm(principal, 'faculty_contribution:delete_own', 'faculty_profile:edit_own')
  return portfolioRepository.deleteContribution({ institutionId: principal.institutionId, userId: principal.userId, id })
}

// Overview & Notifications
export interface FacultyNotificationItem {
  id: string
  severity: 'action_required' | 'info' | 'success'
  title: string
  message: string
  href: string
  timestamp: string
}

export interface FacultyOverviewData {
  profileSummary: {
    employeeId: string | null
    departmentName: string | null
    designation: string | null
    employmentStatus: string
    employmentType: string | null
    specialization: string | null
    photoUrl: string | null
  }
  completeness: CompletenessResult
  counts: {
    qualifications: number
    experiences: number
    teachingLoads: number
    fdps: number
    certifications: number
    publications: number
    patents: number
    grants: number
    consultancies: number
    contributions: number
    events: number
    documents: number
  }
  notifications: FacultyNotificationItem[]
}

export async function getFacultyNotifications(principal: AuthenticatedPrincipal): Promise<FacultyNotificationItem[]> {
  checkPerm(principal, 'faculty_profile:read_own', 'faculty_profile:read_own')
  const { institutionId, userId } = principal

  const profile = await prisma.facultyProfile.findUnique({
    where: { institutionId_userId: { institutionId, userId } },
    select: {
      phone: true,
      orcidId: true,
      _count: { select: { education: true, experiences: true } },
      certifications: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, name: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
      developmentPrograms: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, title: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
      consultancies: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, title: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
      researchGrants: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, title: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
    },
  })

  const items: FacultyNotificationItem[] = []
  const pushNote = (prefix: string, id: string, title: string, status: string, reason: string | null, ts: Date, href: string) => {
    if (status === 'REJECTED') {
      items.push({
        id: `${prefix}-${id}`,
        severity: 'action_required',
        title: `Needs changes: ${title}`,
        message: reason ? `Reviewer feedback: ${reason}` : 'Returned for updates.',
        href,
        timestamp: ts.toISOString(),
      })
    } else if (status === 'VERIFIED') {
      items.push({
        id: `${prefix}-${id}`,
        severity: 'success',
        title: `Verified: ${title}`,
        message: 'Approved by institutional reviewer.',
        href,
        timestamp: ts.toISOString(),
      })
    }
  }

  if (profile) {
    for (const c of profile.certifications) pushNote('fcert', c.id, c.name, c.verificationStatus, c.rejectionReason, c.verifiedAt ?? c.createdAt, '/faculty/development')
    for (const f of profile.developmentPrograms) pushNote('ffdp', f.id, f.title, f.verificationStatus, f.rejectionReason, f.verifiedAt ?? f.createdAt, '/faculty/development')
    for (const con of profile.consultancies) pushNote('fcon', con.id, con.title, con.verificationStatus, con.rejectionReason, con.verifiedAt ?? con.createdAt, '/faculty/consultancy')
    for (const g of profile.researchGrants) pushNote('fgr', g.id, g.title, g.verificationStatus, g.rejectionReason, g.verifiedAt ?? g.createdAt, '/faculty/research')

    if (!profile.phone || !profile.orcidId) {
      items.push({
        id: 'missing-faculty-profile',
        severity: 'info',
        title: 'Complete research & contact identifiers',
        message: 'Add your office phone, specialization, and ORCID / Google Scholar links.',
        href: '/faculty/profile',
        timestamp: new Date().toISOString(),
      })
    }
    if (profile._count.education === 0) {
      items.push({
        id: 'missing-faculty-edu',
        severity: 'info',
        title: 'Add academic qualifications',
        message: 'Record your doctoral and postgraduate qualifications.',
        href: '/faculty/qualifications',
        timestamp: new Date().toISOString(),
      })
    }
  }

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function getFacultyOverviewData(principal: AuthenticatedPrincipal): Promise<FacultyOverviewData> {
  checkPerm(principal, 'faculty_profile:read_own', 'faculty_profile:read_own')
  const { institutionId, userId } = principal

  const [profile, eventCount, documentCount, notifications] = await Promise.all([
    prisma.facultyProfile.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: {
        employeeId: true,
        departmentId: true,
        designation: true,
        employmentStatus: true,
        employmentType: true,
        specialization: true,
        phone: true,
        office: true,
        linkedinUrl: true,
        orcidId: true,
        photoUrl: true,
        department: { select: { name: true } },
        _count: {
          select: {
            education: true,
            experiences: true,
            teachingLoads: true,
            developmentPrograms: true,
            certifications: true,
            researchPapers: true,
            publicationLinks: true,
            patents: true,
            researchGrants: true,
            consultancies: true,
            contributions: true,
          },
        },
      },
    }),
    prisma.eventParticipation.count({ where: { institutionId, userId } }),
    prisma.document.count({ where: { institutionId, ownerUserId: userId } }),
    getFacultyNotifications(principal),
  ])

  const counts = {
    qualifications: profile?._count.education ?? 0,
    experiences: profile?._count.experiences ?? 0,
    teachingLoads: profile?._count.teachingLoads ?? 0,
    fdps: profile?._count.developmentPrograms ?? 0,
    certifications: profile?._count.certifications ?? 0,
    publications: (profile?._count.publicationLinks ?? 0) + (profile?._count.researchPapers ?? 0),
    patents: profile?._count.patents ?? 0,
    grants: profile?._count.researchGrants ?? 0,
    consultancies: profile?._count.consultancies ?? 0,
    contributions: profile?._count.contributions ?? 0,
    events: eventCount,
    documents: documentCount,
  }

  const completeness = calculateFacultyCompleteness({
    hasPersonalInfo: Boolean(profile?.phone || profile?.office || profile?.linkedinUrl || profile?.orcidId),
    hasInstitutionalIdentity: Boolean(profile?.employeeId && profile?.departmentId),
    educationCount: counts.qualifications,
    experienceCount: counts.experiences,
    certificationCount: counts.certifications,
    researchPaperCount: profile?._count.researchPapers ?? 0,
    patentCount: counts.patents,
    fdpCount: counts.fdps,
    teachingLoadCount: counts.teachingLoads,
    canonicalPublicationCount: profile?._count.publicationLinks ?? 0,
    grantCount: counts.grants,
    consultancyCount: counts.consultancies,
    contributionCount: counts.contributions,
  })

  return {
    profileSummary: {
      employeeId: profile?.employeeId ?? null,
      departmentName: profile?.department?.name ?? null,
      designation: profile?.designation ?? null,
      employmentStatus: profile?.employmentStatus ?? 'ACTIVE',
      employmentType: profile?.employmentType ?? null,
      specialization: profile?.specialization ?? null,
      photoUrl: profile?.photoUrl ?? null,
    },
    completeness,
    counts,
    notifications,
  }
}
