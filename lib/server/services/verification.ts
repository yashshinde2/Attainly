import 'server-only'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
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
})

export async function setVerificationStatus(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<void> {
  requirePermission(input.principal, 'record:verify')
  const { institutionId } = input.principal
  const { itemType, itemId, status } = statusInput.parse(input.data)

  switch (itemType) {
    case 'ACHIEVEMENT':
      await prisma.achievement.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
    case 'CERTIFICATION':
      await prisma.studentCertification.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
    case 'RESEARCH_PAPER':
      await prisma.studentResearchPaper.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
    case 'PATENT':
      await prisma.studentPatent.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
    case 'INTERNSHIP':
      await prisma.studentInternship.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
    case 'FACULTY_CERTIFICATION':
      await prisma.facultyCertification.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
    case 'FACULTY_RESEARCH_PAPER':
      await prisma.facultyResearchPaper.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
    case 'FACULTY_PATENT':
      await prisma.facultyPatent.update({
        where: { institutionId_id: { institutionId, id: itemId } },
        data: { verificationStatus: status },
      })
      break
  }
}
