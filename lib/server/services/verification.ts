import 'server-only'
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
}

export async function listPendingForInstitution(input: {
  principal: AuthenticatedPrincipal
}): Promise<PendingVerificationItem[]> {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal

  const [
    achievements,
    certifications,
    papers,
    patents,
    internships,
    facultyCertifications,
    facultyPapers,
    facultyPatents,
    facultyFdps,
    canonicalPubs,
    facultyGrants,
    facultyConsultancies,
    facultyContributions,
    placementOffers,
    graduateOutcomes,
  ] = await Promise.all([
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
  const { itemType, itemId, status, rejectionReason } = statusInput.parse(input.data)

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

  const updateData = {
    verificationStatus: status,
    verifiedByUserId: input.principal.userId,
    verifiedAt: new Date(),
    rejectionReason: normalizedReason,
    version: { increment: 1 },
  }

  switch (itemType) {
    case 'ACHIEVEMENT':
      await prisma.achievement.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'CERTIFICATION':
      await prisma.studentCertification.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'RESEARCH_PAPER':
      await prisma.studentResearchPaper.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'PATENT':
      await prisma.studentPatent.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'INTERNSHIP':
      await prisma.studentInternship.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'FACULTY_CERTIFICATION':
      await prisma.facultyCertification.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'FACULTY_RESEARCH_PAPER':
      await prisma.facultyResearchPaper.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'FACULTY_PATENT':
      await prisma.facultyPatent.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'FACULTY_FDP':
      await prisma.facultyDevelopmentProgram.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'CANONICAL_PUBLICATION':
      await prisma.canonicalPublication.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'FACULTY_GRANT':
      await prisma.facultyResearchGrant.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'FACULTY_CONSULTANCY':
      await prisma.facultyConsultancy.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'FACULTY_CONTRIBUTION':
      await prisma.facultyContribution.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'PLACEMENT_OFFER':
      await prisma.studentPlacementOffer.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
    case 'GRADUATE_OUTCOME':
      await prisma.studentGraduateOutcome.update({ where: { institutionId_id: { institutionId, id: itemId } }, data: updateData })
      break
  }

  await prisma.verificationAuditLog.create({
    data: {
      institutionId,
      itemType,
      itemId,
      action: status,
      actorUserId: input.principal.userId,
      comment: normalizedReason,
    },
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
}): Promise<VerificationCenterItem[]> {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal
  const allowedDepts = await resolveDepartmentScope(input.principal)
  if (input.departmentId) assertDepartmentAccess(allowedDepts, input.departmentId)

  const pendingItems = await listPendingForInstitution({ principal: input.principal })
  const assignments = await prisma.verificationAssignment.findMany({
    where: { institutionId },
  })
  const reviewerIds = Array.from(new Set(assignments.map((a) => a.assignedToUserId)))
  const reviewers = reviewerIds.length
    ? await prisma.user.findMany({
        where: { institutionId, id: { in: reviewerIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : []
  const reviewerNameById = new Map(reviewers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))
  const assignmentByKey = new Map(assignments.map((a) => [`${a.itemType}::${a.itemId}`, a]))

  const cutoff7 = Date.now() - 7 * 24 * 60 * 60 * 1000
  let enriched: VerificationCenterItem[] = pendingItems.map((item) => {
    const asg = assignmentByKey.get(`${item.itemType}::${item.id}`)
    return {
      ...item,
      verificationStatus: 'PENDING',
      departmentId: null,
      isOverdue: item.submittedAt.getTime() < cutoff7,
      assignedToUserId: asg?.assignedToUserId ?? null,
      assignedReviewerName: asg ? (reviewerNameById.get(asg.assignedToUserId) ?? null) : null,
      rejectionReason: null,
    }
  })

  if (input.itemType) {
    enriched = enriched.filter((i) => i.itemType === input.itemType)
  }
  if (input.overdueOnly) {
    enriched = enriched.filter((i) => i.isOverdue)
  }
  if (input.assignedToMe) {
    enriched = enriched.filter((i) => i.assignedToUserId === input.principal.userId)
  }

  return enriched
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
