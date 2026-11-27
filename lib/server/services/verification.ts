import 'server-only'
import { prisma } from '@/lib/server/db'
import { AuthorizationError, requirePermission, type AuthenticatedPrincipal } from '../authorization'
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
  }
}
