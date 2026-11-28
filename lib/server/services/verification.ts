import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/server/db'
import { AuthorizationError, requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { z } from 'zod'

export interface PendingVerificationItem {
  id: string
  itemType:
    | 'ACHIEVEMENT'
    | 'CERTIFICATION'
    | 'RESEARCH_PAPER'
    | 'PATENT'
    | 'INTERNSHIP'
    | 'FACULTY_CERTIFICATION'
    | 'FACULTY_RESEARCH_PAPER'
    | 'FACULTY_PATENT'
    | 'FACULTY_FDP'
    | 'CANONICAL_PUBLICATION'
    | 'FACULTY_GRANT'
    | 'FACULTY_CONSULTANCY'
    | 'FACULTY_CONTRIBUTION'
    | 'PLACEMENT_OFFER'
    | 'GRADUATE_OUTCOME'
  title: string
  studentName: string
  studentEmail: string
  enrollmentNumber: string | null
  submittedAt: Date
  details: string | null
  fileUrl: string | null
  version: number
}

export async function listPendingForInstitution(input: {
  principal: AuthenticatedPrincipal
}): Promise<PendingVerificationItem[]> {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal

  const [achievements, certifications, papers, patents, internships] = await Promise.all([
    prisma.achievement.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { studentProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studentCertification.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { studentProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studentResearchPaper.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { studentProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studentPatent.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { studentProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.studentInternship.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { studentProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const [facultyCertifications, facultyPapers, facultyPatents, facultyFdps, canonicalPubs] = await Promise.all([
    prisma.facultyCertification.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { facultyProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.facultyResearchPaper.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { facultyProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.facultyPatent.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { facultyProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.facultyDevelopmentProgram.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      include: { facultyProfile: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.canonicalPublication.findMany({
      where: { institutionId, verificationStatus: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const [facultyGrants, facultyConsultancies, facultyContributions, placementOffers, graduateOutcomes] =
    await Promise.all([
      prisma.facultyResearchGrant.findMany({
        where: { institutionId, verificationStatus: 'PENDING' },
        include: { facultyProfile: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.facultyConsultancy.findMany({
        where: { institutionId, verificationStatus: 'PENDING' },
        include: { facultyProfile: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.facultyContribution.findMany({
        where: { institutionId, verificationStatus: 'PENDING' },
        include: { facultyProfile: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentPlacementOffer.findMany({
        where: { institutionId, verificationStatus: 'PENDING' },
        include: { studentProfile: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentGraduateOutcome.findMany({
        where: { institutionId, verificationStatus: 'PENDING' },
        include: { studentProfile: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

  const items: PendingVerificationItem[] = []

  for (const a of achievements) {
    items.push({
      id: a.id,
      itemType: 'ACHIEVEMENT',
      title: a.title,
      studentName: `${a.studentProfile.user.firstName} ${a.studentProfile.user.lastName}`.trim(),
      studentEmail: a.studentProfile.user.email,
      enrollmentNumber: a.studentProfile.enrollmentNumber,
      submittedAt: a.createdAt,
      details: `Category: ${a.category} | Status: ${a.status}${a.description ? ` | ${a.description}` : ''}`,
      fileUrl: null,
      version: a.version,
    })
  }

  for (const c of certifications) {
    items.push({
      id: c.id,
      itemType: 'CERTIFICATION',
      title: c.name,
      studentName: `${c.studentProfile.user.firstName} ${c.studentProfile.user.lastName}`.trim(),
      studentEmail: c.studentProfile.user.email,
      enrollmentNumber: c.studentProfile.enrollmentNumber,
      submittedAt: c.createdAt,
      details: c.issuer ? `Issuer: ${c.issuer}` : null,
      fileUrl: c.fileUrl,
      version: c.version,
    })
  }

  for (const r of papers) {
    items.push({
      id: r.id,
      itemType: 'RESEARCH_PAPER',
      title: r.title,
      studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`.trim(),
      studentEmail: r.studentProfile.user.email,
      enrollmentNumber: r.studentProfile.enrollmentNumber,
      submittedAt: r.createdAt,
      details: `Publication: ${r.publication ?? 'N/A'}${r.doi ? ` | DOI: ${r.doi}` : ''}`,
      fileUrl: r.fileUrl,
      version: r.version,
    })
  }

  for (const p of patents) {
    items.push({
      id: p.id,
      itemType: 'PATENT',
      title: p.title,
      studentName: `${p.studentProfile.user.firstName} ${p.studentProfile.user.lastName}`.trim(),
      studentEmail: p.studentProfile.user.email,
      enrollmentNumber: p.studentProfile.enrollmentNumber,
      submittedAt: p.createdAt,
      details: `Patent #: ${p.patentNumber ?? 'N/A'} | Status: ${p.status ?? 'N/A'}`,
      fileUrl: p.fileUrl,
      version: p.version,
    })
  }

  for (const i of internships) {
    items.push({
      id: i.id,
      itemType: 'INTERNSHIP',
      title: `${i.organization} - ${i.role ?? 'Intern'}`,
      studentName: `${i.studentProfile.user.firstName} ${i.studentProfile.user.lastName}`.trim(),
      studentEmail: i.studentProfile.user.email,
      enrollmentNumber: i.studentProfile.enrollmentNumber,
      submittedAt: i.createdAt,
      details: `${i.offerType !== 'NONE' ? `Offer: ${i.offerType} | ` : ''}${i.description ?? ''}`,
      fileUrl: null,
      version: i.version,
    })
  }

  // Faculty Records
  for (const fc of facultyCertifications) {
    items.push({
      id: fc.id,
      itemType: 'FACULTY_CERTIFICATION',
      title: fc.name,
      studentName: `Faculty: ${fc.facultyProfile.user.firstName} ${fc.facultyProfile.user.lastName}`.trim(),
      studentEmail: fc.facultyProfile.user.email,
      enrollmentNumber: fc.facultyProfile.office ? `Office: ${fc.facultyProfile.office}` : null,
      submittedAt: fc.createdAt,
      details: fc.issuer ? `Issuer: ${fc.issuer}` : null,
      fileUrl: fc.fileUrl,
      version: fc.version,
    })
  }

  for (const fp of facultyPapers) {
    items.push({
      id: fp.id,
      itemType: 'FACULTY_RESEARCH_PAPER',
      title: fp.title,
      studentName: `Faculty: ${fp.facultyProfile.user.firstName} ${fp.facultyProfile.user.lastName}`.trim(),
      studentEmail: fp.facultyProfile.user.email,
      enrollmentNumber: fp.facultyProfile.office ? `Office: ${fp.facultyProfile.office}` : null,
      submittedAt: fp.createdAt,
      details: `Publication: ${fp.publication ?? 'N/A'}${fp.doi ? ` | DOI: ${fp.doi}` : ''}`,
      fileUrl: fp.fileUrl,
      version: fp.version,
    })
  }

  for (const fpat of facultyPatents) {
    items.push({
      id: fpat.id,
      itemType: 'FACULTY_PATENT',
      title: fpat.title,
      studentName: `Faculty: ${fpat.facultyProfile.user.firstName} ${fpat.facultyProfile.user.lastName}`.trim(),
      studentEmail: fpat.facultyProfile.user.email,
      enrollmentNumber: fpat.facultyProfile.office ? `Office: ${fpat.facultyProfile.office}` : null,
      submittedAt: fpat.createdAt,
      details: `Patent #: ${fpat.patentNumber ?? 'N/A'} | Status: ${fpat.status ?? 'N/A'}`,
      fileUrl: fpat.fileUrl,
      version: fpat.version,
    })
  }

  for (const ffdp of facultyFdps) {
    items.push({
      id: ffdp.id,
      itemType: 'FACULTY_FDP',
      title: `${ffdp.programType}: ${ffdp.title}`,
      studentName: `Faculty: ${ffdp.facultyProfile.user.firstName} ${ffdp.facultyProfile.user.lastName}`.trim(),
      studentEmail: ffdp.facultyProfile.user.email,
      enrollmentNumber: ffdp.facultyProfile.employeeId ?? null,
      submittedAt: ffdp.createdAt,
      details: `${ffdp.organizer} (${ffdp.mode})`,
      fileUrl: ffdp.documentUrl,
      version: ffdp.version,
    })
  }

  for (const cpub of canonicalPubs) {
    items.push({
      id: cpub.id,
      itemType: 'CANONICAL_PUBLICATION',
      title: cpub.title,
      studentName: `Faculty Publication (${cpub.publicationType})`,
      studentEmail: cpub.authorsText ?? 'Institutional contributor',
      enrollmentNumber: cpub.doi ? `DOI: ${cpub.doi}` : null,
      submittedAt: cpub.createdAt,
      details: [cpub.journalOrConference, cpub.indexing].filter(Boolean).join(' | ') || null,
      fileUrl: cpub.fileUrl,
      version: cpub.version,
    })
  }

  for (const fg of facultyGrants) {
    items.push({
      id: fg.id,
      itemType: 'FACULTY_GRANT',
      title: fg.title,
      studentName: `Faculty: ${fg.facultyProfile.user.firstName} ${fg.facultyProfile.user.lastName}`.trim(),
      studentEmail: fg.facultyProfile.user.email,
      enrollmentNumber: fg.facultyProfile.employeeId ?? null,
      submittedAt: fg.createdAt,
      details: `${fg.fundingAgency} (${fg.role})${fg.amount ? ` | ${fg.amount}` : ''}`,
      fileUrl: fg.documentUrl,
      version: fg.version,
    })
  }

  for (const fc of facultyConsultancies) {
    items.push({
      id: fc.id,
      itemType: 'FACULTY_CONSULTANCY',
      title: fc.title,
      studentName: `Faculty: ${fc.facultyProfile.user.firstName} ${fc.facultyProfile.user.lastName}`.trim(),
      studentEmail: fc.facultyProfile.user.email,
      enrollmentNumber: fc.facultyProfile.employeeId ?? null,
      submittedAt: fc.createdAt,
      details: `${fc.clientOrganization}${fc.amount ? ` | ${fc.amount}` : ''}`,
      fileUrl: fc.documentUrl,
      version: fc.version,
    })
  }

  for (const fcon of facultyContributions) {
    items.push({
      id: fcon.id,
      itemType: 'FACULTY_CONTRIBUTION',
      title: fcon.title,
      studentName: `Faculty: ${fcon.facultyProfile.user.firstName} ${fcon.facultyProfile.user.lastName}`.trim(),
      studentEmail: fcon.facultyProfile.user.email,
      enrollmentNumber: fcon.facultyProfile.employeeId ?? null,
      submittedAt: fcon.createdAt,
      details: `${fcon.contributionType}${fcon.organizationOrBody ? ` | ${fcon.organizationOrBody}` : ''}`,
      fileUrl: fcon.documentUrl,
      version: fcon.version,
    })
  }

  for (const po of placementOffers) {
    items.push({
      id: po.id,
      itemType: 'PLACEMENT_OFFER',
      title: `${po.companyName} — ${po.role}`,
      studentName: `${po.studentProfile.user.firstName} ${po.studentProfile.user.lastName}`.trim(),
      studentEmail: po.studentProfile.user.email,
      enrollmentNumber: po.studentProfile.enrollmentNumber,
      submittedAt: po.createdAt,
      details: `Status: ${po.status}${po.packageCtc ? ` | CTC: ${po.packageCtc}` : ''}`,
      fileUrl: po.offerLetterUrl,
      version: po.version,
    })
  }

  for (const go of graduateOutcomes) {
    items.push({
      id: go.id,
      itemType: 'GRADUATE_OUTCOME',
      title: `Outcome: ${go.outcomeType.replace(/_/g, ' ')}`,
      studentName: `${go.studentProfile.user.firstName} ${go.studentProfile.user.lastName}`.trim(),
      studentEmail: go.studentProfile.user.email,
      enrollmentNumber: go.studentProfile.enrollmentNumber,
      submittedAt: go.updatedAt,
      details: `${go.organizationOrUniversity ?? ''}${go.programOrRole ? ` — ${go.programOrRole}` : ''}`.trim() || null,
      fileUrl: go.evidenceUrl,
      version: go.version,
    })
  }

  return items.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
}

const statusInput = z.object({
  itemType: z.enum([
    'ACHIEVEMENT',
    'CERTIFICATION',
    'RESEARCH_PAPER',
    'PATENT',
    'INTERNSHIP',
    'FACULTY_CERTIFICATION',
    'FACULTY_RESEARCH_PAPER',
    'FACULTY_PATENT',
    'FACULTY_FDP',
    'CANONICAL_PUBLICATION',
    'FACULTY_GRANT',
    'FACULTY_CONSULTANCY',
    'FACULTY_CONTRIBUTION',
    'PLACEMENT_OFFER',
    'GRADUATE_OUTCOME',
  ]),
  itemId: z.string().min(1),
  status: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().trim().max(500).nullable().optional(),
  expectedVersion: z.number().int().positive(),
})

/**
 * Pure validation for verification transitions (exported for automated tests).
 */
export function validateVerificationTransition(input: {
  principalUserId: string
  ownerUserId: string
  status: 'VERIFIED' | 'REJECTED'
  rejectionReason?: string | null
}): string | null {
  if (input.principalUserId === input.ownerUserId) {
    throw new AuthorizationError('Self-verification is not permitted.')
  }
  const trimmedReason = input.rejectionReason?.trim() ?? ''
  if (input.status === 'REJECTED' && !trimmedReason) {
    throw new Error('Please provide a rejection reason so the submitter knows what to fix.')
  }
  return input.status === 'REJECTED' ? trimmedReason : null
}

async function resolveOwnerUserId(
  institutionId: string,
  itemType: z.infer<typeof statusInput>['itemType'],
  itemId: string,
): Promise<string | null> {
  switch (itemType) {
    case 'ACHIEVEMENT': {
      const r = await prisma.achievement.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { studentProfile: { select: { userId: true } } },
      })
      return r?.studentProfile.userId ?? null
    }
    case 'CERTIFICATION': {
      const r = await prisma.studentCertification.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { studentProfile: { select: { userId: true } } },
      })
      return r?.studentProfile.userId ?? null
    }
    case 'RESEARCH_PAPER': {
      const r = await prisma.studentResearchPaper.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { studentProfile: { select: { userId: true } } },
      })
      return r?.studentProfile.userId ?? null
    }
    case 'PATENT': {
      const r = await prisma.studentPatent.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { studentProfile: { select: { userId: true } } },
      })
      return r?.studentProfile.userId ?? null
    }
    case 'INTERNSHIP': {
      const r = await prisma.studentInternship.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { studentProfile: { select: { userId: true } } },
      })
      return r?.studentProfile.userId ?? null
    }
    case 'FACULTY_CERTIFICATION': {
      const r = await prisma.facultyCertification.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { facultyProfile: { select: { userId: true } } },
      })
      return r?.facultyProfile.userId ?? null
    }
    case 'FACULTY_RESEARCH_PAPER': {
      const r = await prisma.facultyResearchPaper.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { facultyProfile: { select: { userId: true } } },
      })
      return r?.facultyProfile.userId ?? null
    }
    case 'FACULTY_PATENT': {
      const r = await prisma.facultyPatent.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { facultyProfile: { select: { userId: true } } },
      })
      return r?.facultyProfile.userId ?? null
    }
    case 'FACULTY_FDP': {
      const r = await prisma.facultyDevelopmentProgram.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { facultyProfile: { select: { userId: true } } },
      })
      return r?.facultyProfile.userId ?? null
    }
    case 'CANONICAL_PUBLICATION': {
      const r = await prisma.canonicalPublication.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { createdByUserId: true },
      })
      return r?.createdByUserId ?? null
    }
    case 'FACULTY_GRANT': {
      const r = await prisma.facultyResearchGrant.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { facultyProfile: { select: { userId: true } } },
      })
      return r?.facultyProfile.userId ?? null
    }
    case 'FACULTY_CONSULTANCY': {
      const r = await prisma.facultyConsultancy.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { facultyProfile: { select: { userId: true } } },
      })
      return r?.facultyProfile.userId ?? null
    }
    case 'FACULTY_CONTRIBUTION': {
      const r = await prisma.facultyContribution.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { facultyProfile: { select: { userId: true } } },
      })
      return r?.facultyProfile.userId ?? null
    }
    case 'PLACEMENT_OFFER': {
      const r = await prisma.studentPlacementOffer.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { studentProfile: { select: { userId: true } } },
      })
      return r?.studentProfile.userId ?? null
    }
    case 'GRADUATE_OUTCOME': {
      const r = await prisma.studentGraduateOutcome.findUnique({
        where: { institutionId_id: { institutionId, id: itemId } },
        select: { studentProfile: { select: { userId: true } } },
      })
      return r?.studentProfile.userId ?? null
    }
  }
}

export async function setVerificationStatus(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<void> {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal
  const { itemType, itemId, status, rejectionReason, expectedVersion } = statusInput.parse(input.data)

  const ownerUserId = await resolveOwnerUserId(institutionId, itemType, itemId)
  if (!ownerUserId) {
    throw new Error('Verification record not found in this institution.')
  }

  const allowedDepts = await resolveDepartmentScope(input.principal)
  if (allowedDepts !== null) {
    const ownerProfile = await prisma.user.findUnique({
      where: { institutionId_id: { institutionId, id: ownerUserId } },
      select: {
        student: { select: { departmentId: true } },
        faculty: { select: { departmentId: true } },
      },
    })
    const ownerDepartmentId = ownerProfile?.student?.departmentId ?? ownerProfile?.faculty?.departmentId ?? null
    assertDepartmentAccess(allowedDepts, ownerDepartmentId)
  }

  const normalizedReason = validateVerificationTransition({
    principalUserId: input.principal.userId,
    ownerUserId,
    status,
    rejectionReason,
  })

  const updateWhere = { institutionId, id: itemId, version: expectedVersion }
  const updateData = {
    verificationStatus: status,
    verifiedByUserId: input.principal.userId,
    verifiedAt: new Date(),
    rejectionReason: normalizedReason,
    version: { increment: 1 },
  }

  await prisma.$transaction(async (tx) => {
    let updatedCount = 0
    switch (itemType) {
      case 'ACHIEVEMENT':
        updatedCount = (await tx.achievement.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'CERTIFICATION':
        updatedCount = (await tx.studentCertification.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'RESEARCH_PAPER':
        updatedCount = (await tx.studentResearchPaper.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'PATENT':
        updatedCount = (await tx.studentPatent.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'INTERNSHIP':
        updatedCount = (await tx.studentInternship.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'FACULTY_CERTIFICATION':
        updatedCount = (await tx.facultyCertification.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'FACULTY_RESEARCH_PAPER':
        updatedCount = (await tx.facultyResearchPaper.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'FACULTY_PATENT':
        updatedCount = (await tx.facultyPatent.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'FACULTY_FDP':
        updatedCount = (await tx.facultyDevelopmentProgram.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'CANONICAL_PUBLICATION':
        updatedCount = (await tx.canonicalPublication.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'FACULTY_GRANT':
        updatedCount = (await tx.facultyResearchGrant.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'FACULTY_CONSULTANCY':
        updatedCount = (await tx.facultyConsultancy.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'FACULTY_CONTRIBUTION':
        updatedCount = (await tx.facultyContribution.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'PLACEMENT_OFFER':
        updatedCount = (await tx.studentPlacementOffer.updateMany({ where: updateWhere, data: updateData })).count
        break
      case 'GRADUATE_OUTCOME':
        updatedCount = (await tx.studentGraduateOutcome.updateMany({ where: updateWhere, data: updateData })).count
        break
    }

    if (updatedCount === 0) {
      throw new Error('This record has changed since you opened it. Refresh and review the latest version.')
    }

    await tx.verificationAuditLog.create({
      data: {
        institutionId,
        itemType,
        itemId,
        action: status,
        actorUserId: input.principal.userId,
        comment: normalizedReason,
      },
    })
  })
}

export interface VerificationCenterItem extends PendingVerificationItem {
  verificationStatus: string
  departmentId: string | null
  isOverdue: boolean
  assignedToUserId: string | null
  assignedReviewerName: string | null
  rejectionReason: string | null
}

export async function listVerificationCenterQueue(input: {
  principal: AuthenticatedPrincipal
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL'
  itemType?: string
  departmentId?: string
  overdueOnly?: boolean
  assignedToMe?: boolean
  limit?: number
  offset?: number
}): Promise<VerificationCenterItem[]> {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)
  if (input.departmentId) assertDepartmentAccess(allowedDepts, input.departmentId)

  const effectiveDepts = input.departmentId ? [input.departmentId] : allowedDepts
  if (effectiveDepts && effectiveDepts.length === 0) return []

  const statusFilter = input.status ?? 'PENDING'
  const statusCond =
    statusFilter === 'ALL'
      ? Prisma.empty
      : Prisma.sql`AND t."verificationStatus" = ${statusFilter}`

  const cutoff7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const overdueCond = input.overdueOnly ? Prisma.sql`AND t."createdAt" < ${cutoff7}` : Prisma.empty

  const deptCondStudent = effectiveDepts
    ? Prisma.sql`AND sp."departmentId" = ANY(${effectiveDepts}::text[])`
    : Prisma.empty
  const deptCondFaculty = effectiveDepts
    ? Prisma.sql`AND fp."departmentId" = ANY(${effectiveDepts}::text[])`
    : Prisma.empty
  const deptCondPub = effectiveDepts
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "PublicationContributor" pc
        JOIN "FacultyProfile" fp2 ON fp2.institution_id = pc.institution_id AND fp2.id = pc."facultyProfileId"
        WHERE pc.institution_id = t.institution_id AND pc."publicationId" = t.id
          AND fp2."departmentId" = ANY(${effectiveDepts}::text[])
      )`
    : Prisma.empty

  const branches: Array<{ key: PendingVerificationItem['itemType']; sql: Prisma.Sql }> = [
    {
      key: 'ACHIEVEMENT',
      sql: Prisma.sql`
        SELECT t.id, 'ACHIEVEMENT'::text AS item_type, t.title,
          TRIM(CONCAT(u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, sp."enrollmentNumber" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT('Category: ', t.category, ' | Status: ', t.status, CASE WHEN t.description IS NOT NULL AND t.description <> '' THEN CONCAT(' | ', t.description) ELSE '' END) AS details,
          NULL::text AS file_url, t.version, t."verificationStatus" AS verification_status,
          sp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "Achievement" t
        JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId"
        JOIN "User" u ON u.institution_id = sp.institution_id AND u.id = sp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondStudent}
      `,
    },
    {
      key: 'CERTIFICATION',
      sql: Prisma.sql`
        SELECT t.id, 'CERTIFICATION'::text AS item_type, t.name AS title,
          TRIM(CONCAT(u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, sp."enrollmentNumber" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CASE WHEN t.issuer IS NOT NULL THEN CONCAT('Issuer: ', t.issuer) ELSE NULL END AS details,
          t."fileUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          sp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "StudentCertification" t
        JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId"
        JOIN "User" u ON u.institution_id = sp.institution_id AND u.id = sp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondStudent}
      `,
    },
    {
      key: 'RESEARCH_PAPER',
      sql: Prisma.sql`
        SELECT t.id, 'RESEARCH_PAPER'::text AS item_type, t.title,
          TRIM(CONCAT(u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, sp."enrollmentNumber" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT('Publication: ', COALESCE(t.publication, 'N/A'), CASE WHEN t.doi IS NOT NULL THEN CONCAT(' | DOI: ', t.doi) ELSE '' END) AS details,
          t."fileUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          sp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "StudentResearchPaper" t
        JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId"
        JOIN "User" u ON u.institution_id = sp.institution_id AND u.id = sp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondStudent}
      `,
    },
    {
      key: 'PATENT',
      sql: Prisma.sql`
        SELECT t.id, 'PATENT'::text AS item_type, t.title,
          TRIM(CONCAT(u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, sp."enrollmentNumber" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT('Patent #: ', COALESCE(t."patentNumber", 'N/A'), ' | Status: ', COALESCE(t.status, 'N/A')) AS details,
          t."fileUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          sp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "StudentPatent" t
        JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId"
        JOIN "User" u ON u.institution_id = sp.institution_id AND u.id = sp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondStudent}
      `,
    },
    {
      key: 'INTERNSHIP',
      sql: Prisma.sql`
        SELECT t.id, 'INTERNSHIP'::text AS item_type,
          CONCAT(t.organization, ' - ', COALESCE(t.role, 'Intern')) AS title,
          TRIM(CONCAT(u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, sp."enrollmentNumber" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT(CASE WHEN t."offerType"::text <> 'NONE' THEN CONCAT('Offer: ', t."offerType"::text, ' | ') ELSE '' END, COALESCE(t.description, '')) AS details,
          NULL::text AS file_url, t.version, t."verificationStatus" AS verification_status,
          sp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "StudentInternship" t
        JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId"
        JOIN "User" u ON u.institution_id = sp.institution_id AND u.id = sp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondStudent}
      `,
    },
    {
      key: 'FACULTY_CERTIFICATION',
      sql: Prisma.sql`
        SELECT t.id, 'FACULTY_CERTIFICATION'::text AS item_type, t.name AS title,
          TRIM(CONCAT('Faculty: ', u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email,
          CASE WHEN fp.office IS NOT NULL THEN CONCAT('Office: ', fp.office) ELSE NULL END AS enrollment_number,
          t."createdAt" AS submitted_at,
          CASE WHEN t.issuer IS NOT NULL THEN CONCAT('Issuer: ', t.issuer) ELSE NULL END AS details,
          t."fileUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          fp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "FacultyCertification" t
        JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId"
        JOIN "User" u ON u.institution_id = fp.institution_id AND u.id = fp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondFaculty}
      `,
    },
    {
      key: 'FACULTY_RESEARCH_PAPER',
      sql: Prisma.sql`
        SELECT t.id, 'FACULTY_RESEARCH_PAPER'::text AS item_type, t.title,
          TRIM(CONCAT('Faculty: ', u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email,
          CASE WHEN fp.office IS NOT NULL THEN CONCAT('Office: ', fp.office) ELSE NULL END AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT('Publication: ', COALESCE(t.publication, 'N/A'), CASE WHEN t.doi IS NOT NULL THEN CONCAT(' | DOI: ', t.doi) ELSE '' END) AS details,
          t."fileUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          fp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "FacultyResearchPaper" t
        JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId"
        JOIN "User" u ON u.institution_id = fp.institution_id AND u.id = fp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondFaculty}
      `,
    },
    {
      key: 'FACULTY_PATENT',
      sql: Prisma.sql`
        SELECT t.id, 'FACULTY_PATENT'::text AS item_type, t.title,
          TRIM(CONCAT('Faculty: ', u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email,
          CASE WHEN fp.office IS NOT NULL THEN CONCAT('Office: ', fp.office) ELSE NULL END AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT('Patent #: ', COALESCE(t."patentNumber", 'N/A'), ' | Status: ', COALESCE(t.status, 'N/A')) AS details,
          t."fileUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          fp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "FacultyPatent" t
        JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId"
        JOIN "User" u ON u.institution_id = fp.institution_id AND u.id = fp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondFaculty}
      `,
    },
    {
      key: 'FACULTY_FDP',
      sql: Prisma.sql`
        SELECT t.id, 'FACULTY_FDP'::text AS item_type,
          CONCAT(t."programType", ': ', t.title) AS title,
          TRIM(CONCAT('Faculty: ', u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, fp."employeeId" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT(t.organizer, ' (', t.mode, ')') AS details,
          t."documentUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          fp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "FacultyDevelopmentProgram" t
        JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId"
        JOIN "User" u ON u.institution_id = fp.institution_id AND u.id = fp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondFaculty}
      `,
    },
    {
      key: 'CANONICAL_PUBLICATION',
      sql: Prisma.sql`
        SELECT t.id, 'CANONICAL_PUBLICATION'::text AS item_type, t.title,
          CONCAT('Faculty Publication (', t."publicationType", ')') AS student_name,
          COALESCE(t."authorsText", 'Institutional contributor') AS student_email,
          CASE WHEN t.doi IS NOT NULL THEN CONCAT('DOI: ', t.doi) ELSE NULL END AS enrollment_number,
          t."createdAt" AS submitted_at,
          NULLIF(CONCAT_WS(' | ', t."journalOrConference", t.indexing), '') AS details,
          t."fileUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          NULL::text AS department_id, t."rejectionReason" AS rejection_reason
        FROM "CanonicalPublication" t
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondPub}
      `,
    },
    {
      key: 'FACULTY_GRANT',
      sql: Prisma.sql`
        SELECT t.id, 'FACULTY_GRANT'::text AS item_type, t.title,
          TRIM(CONCAT('Faculty: ', u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, fp."employeeId" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT(t."fundingAgency", ' (', t.role, ')', CASE WHEN t.amount IS NOT NULL THEN CONCAT(' | ', t.amount::text) ELSE '' END) AS details,
          t."documentUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          fp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "FacultyResearchGrant" t
        JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId"
        JOIN "User" u ON u.institution_id = fp.institution_id AND u.id = fp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondFaculty}
      `,
    },
    {
      key: 'FACULTY_CONSULTANCY',
      sql: Prisma.sql`
        SELECT t.id, 'FACULTY_CONSULTANCY'::text AS item_type, t.title,
          TRIM(CONCAT('Faculty: ', u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, fp."employeeId" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT(t."clientOrganization", CASE WHEN t.amount IS NOT NULL THEN CONCAT(' | ', t.amount::text) ELSE '' END) AS details,
          t."documentUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          fp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "FacultyConsultancy" t
        JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId"
        JOIN "User" u ON u.institution_id = fp.institution_id AND u.id = fp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondFaculty}
      `,
    },
    {
      key: 'FACULTY_CONTRIBUTION',
      sql: Prisma.sql`
        SELECT t.id, 'FACULTY_CONTRIBUTION'::text AS item_type, t.title,
          TRIM(CONCAT('Faculty: ', u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, fp."employeeId" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT(t."contributionType", CASE WHEN t."organizationOrBody" IS NOT NULL THEN CONCAT(' | ', t."organizationOrBody") ELSE '' END) AS details,
          t."documentUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          fp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "FacultyContribution" t
        JOIN "FacultyProfile" fp ON fp.institution_id = t.institution_id AND fp.id = t."facultyProfileId"
        JOIN "User" u ON u.institution_id = fp.institution_id AND u.id = fp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondFaculty}
      `,
    },
    {
      key: 'PLACEMENT_OFFER',
      sql: Prisma.sql`
        SELECT t.id, 'PLACEMENT_OFFER'::text AS item_type,
          CONCAT(t."companyName", ' — ', t.role) AS title,
          TRIM(CONCAT(u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, sp."enrollmentNumber" AS enrollment_number,
          t."createdAt" AS submitted_at,
          CONCAT('Status: ', t.status, CASE WHEN t."packageCtc" IS NOT NULL THEN CONCAT(' | CTC: ', t."packageCtc"::text) ELSE '' END) AS details,
          t."offerLetterUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          sp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "StudentPlacementOffer" t
        JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId"
        JOIN "User" u ON u.institution_id = sp.institution_id AND u.id = sp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondStudent}
      `,
    },
    {
      key: 'GRADUATE_OUTCOME',
      sql: Prisma.sql`
        SELECT t.id, 'GRADUATE_OUTCOME'::text AS item_type,
          CONCAT('Outcome: ', REPLACE(t."outcomeType"::text, '_', ' ')) AS title,
          TRIM(CONCAT(u."firstName", ' ', u."lastName")) AS student_name,
          u.email AS student_email, sp."enrollmentNumber" AS enrollment_number,
          t."createdAt" AS submitted_at,
          NULLIF(CONCAT_WS(' | ', t."organizationOrUniversity", t."programOrRole"), '') AS details,
          t."evidenceUrl" AS file_url, t.version, t."verificationStatus" AS verification_status,
          sp."departmentId" AS department_id, t."rejectionReason" AS rejection_reason
        FROM "StudentGraduateOutcome" t
        JOIN "StudentProfile" sp ON sp.institution_id = t.institution_id AND sp.id = t."studentProfileId"
        JOIN "User" u ON u.institution_id = sp.institution_id AND u.id = sp."userId"
        WHERE t.institution_id = ${institutionId} ${statusCond} ${overdueCond} ${deptCondStudent}
      `,
    },
  ]

  const selectedBranches = input.itemType
    ? branches.filter((b) => b.key === input.itemType)
    : branches
  if (selectedBranches.length === 0) return []

  const unionSql = Prisma.join(selectedBranches.map((b) => b.sql), ' UNION ALL ')
  const assignedCond = input.assignedToMe
    ? Prisma.sql`WHERE va."assignedToUserId" = ${input.principal.userId}`
    : Prisma.empty
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500)
  const offset = Math.max(input.offset ?? 0, 0)

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      item_type: PendingVerificationItem['itemType']
      title: string
      student_name: string
      student_email: string
      enrollment_number: string | null
      submitted_at: Date
      details: string | null
      file_url: string | null
      version: number
      verification_status: string
      department_id: string | null
      rejection_reason: string | null
      assigned_to_user_id: string | null
      assigned_reviewer_name: string | null
    }>
  >`
    WITH queue AS (
      ${unionSql}
    )
    SELECT
      q.*,
      va."assignedToUserId" AS assigned_to_user_id,
      CASE
        WHEN rev.id IS NOT NULL THEN TRIM(CONCAT(rev."firstName", ' ', rev."lastName"))
        ELSE NULL
      END AS assigned_reviewer_name
    FROM queue q
    LEFT JOIN "VerificationAssignment" va
      ON va.institution_id = ${institutionId}
     AND va."itemType" = q.item_type
     AND va."itemId" = q.id
    LEFT JOIN "User" rev
      ON rev.institution_id = va.institution_id
     AND rev.id = va."assignedToUserId"
    ${assignedCond}
    ORDER BY q.submitted_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `

  const cutoffMs = cutoff7.getTime()
  return rows.map((row) => ({
    id: row.id,
    itemType: row.item_type,
    title: row.title,
    studentName: row.student_name,
    studentEmail: row.student_email,
    enrollmentNumber: row.enrollment_number,
    submittedAt: row.submitted_at instanceof Date ? row.submitted_at : new Date(row.submitted_at),
    details: row.details,
    fileUrl: row.file_url,
    version: row.version,
    verificationStatus: row.verification_status,
    departmentId: row.department_id,
    isOverdue: (row.submitted_at instanceof Date ? row.submitted_at : new Date(row.submitted_at)).getTime() < cutoffMs,
    assignedToUserId: row.assigned_to_user_id,
    assignedReviewerName: row.assigned_reviewer_name,
    rejectionReason: row.rejection_reason,
  }))
}

export async function assignVerificationReviewer(input: {
  principal: AuthenticatedPrincipal
  itemType: string
  itemId: string
  assignedToUserId: string
}): Promise<void> {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal

  const reviewer = await prisma.user.findUnique({
    where: { institutionId_id: { institutionId, id: input.assignedToUserId } },
    select: { id: true, isActive: true },
  })
  if (!reviewer || !reviewer.isActive) {
    throw new Error('Selected reviewer is invalid or inactive.')
  }

  await prisma.verificationAssignment.upsert({
    where: {
      institutionId_itemType_itemId: {
        institutionId,
        itemType: input.itemType,
        itemId: input.itemId,
      },
    },
    create: {
      institutionId,
      itemType: input.itemType,
      itemId: input.itemId,
      assignedToUserId: input.assignedToUserId,
      assignedByUserId: input.principal.userId,
    },
    update: {
      assignedToUserId: input.assignedToUserId,
      assignedByUserId: input.principal.userId,
    },
  })

  await prisma.verificationAuditLog.create({
    data: {
      institutionId,
      itemType: input.itemType,
      itemId: input.itemId,
      action: 'ASSIGNED',
      actorUserId: input.principal.userId,
      assignedToUserId: input.assignedToUserId,
    },
  })
}

export async function listVerificationHistory(input: {
  principal: AuthenticatedPrincipal
  limit?: number
}) {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal
  const logs = await prisma.verificationAuditLog.findMany({
    where: { institutionId },
    orderBy: { createdAt: 'desc' },
    take: input.limit ?? 25,
  })
  const userIds = Array.from(
    new Set(logs.flatMap((l) => [l.actorUserId, ...(l.assignedToUserId ? [l.assignedToUserId] : [])])),
  )
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { institutionId, id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))

  return logs.map((l) => ({
    ...l,
    actorName: userMap.get(l.actorUserId) ?? 'Reviewer',
    assignedToName: l.assignedToUserId ? (userMap.get(l.assignedToUserId) ?? 'Reviewer') : null,
  }))
}

export interface BulkVerificationItemInput {
  itemType: PendingVerificationItem['itemType']
  itemId: string
  expectedVersion: number
}

export async function bulkDecideVerifications(input: {
  principal: AuthenticatedPrincipal
  items: BulkVerificationItemInput[]
  decision: 'VERIFIED' | 'REJECTED'
  rejectionReason?: string | null
}) {
  requirePermission(input.principal, 'record:verify')
  if (input.items.length === 0 || input.items.length > 50) {
    throw new Error('Select between 1 and 50 items for bulk review.')
  }
  if (input.decision === 'REJECTED' && !input.rejectionReason?.trim()) {
    throw new Error('A correction/rejection reason is required for bulk rejection.')
  }

  let succeededCount = 0
  let failedCount = 0
  const results: Array<{ itemType: string; itemId: string; status: 'SUCCEEDED' | 'FAILED'; error?: string }> = []

  for (const item of input.items) {
    try {
      await setVerificationStatus({
        principal: input.principal,
        data: {
          itemType: item.itemType,
          itemId: item.itemId,
          expectedVersion: item.expectedVersion,
          status: input.decision,
          rejectionReason: input.rejectionReason ?? null,
        },
      })
      succeededCount += 1
      results.push({ itemType: item.itemType, itemId: item.itemId, status: 'SUCCEEDED' })
    } catch (err) {
      failedCount += 1
      results.push({
        itemType: item.itemType,
        itemId: item.itemId,
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Decision failed.',
      })
    }
  }

  return { succeededCount, failedCount, results }
}

export async function applyReviewerAssignmentRules(principal: AuthenticatedPrincipal) {
  requirePermission(principal, 'record:verify')
  const { institutionId } = principal
  const [rules, queueItems] = await Promise.all([
    prisma.reviewerAssignmentRule.findMany({
      where: { institutionId, isActive: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),
    listVerificationCenterQueue({ principal, limit: 100, offset: 0 }),
  ])

  if (rules.length === 0) return { assignedCount: 0 }

  let assignedCount = 0
  for (const item of queueItems) {
    if (item.assignedToUserId) continue
    const match =
      rules.find((r) => r.departmentId === item.departmentId && r.itemType === item.itemType) ??
      rules.find((r) => r.departmentId === item.departmentId && r.itemType === 'ALL') ??
      rules.find((r) => r.departmentId === null && r.itemType === item.itemType) ??
      rules.find((r) => r.departmentId === null && r.itemType === 'ALL')
    if (!match) continue

    try {
      await assignVerificationReviewer({
        principal,
        itemType: item.itemType,
        itemId: item.id,
        assignedToUserId: match.reviewerUserId,
      })
      assignedCount += 1
    } catch {
      // Skip items outside reviewer scope or deleted concurrently
    }
  }

  return { assignedCount }
}
