import 'server-only'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { z } from 'zod'

export interface PendingVerificationItem {
  id: string
  itemType: 'ACHIEVEMENT' | 'CERTIFICATION' | 'RESEARCH_PAPER' | 'PATENT' | 'INTERNSHIP'
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

  return items.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
}

const statusInput = z.object({
  itemType: z.enum(['ACHIEVEMENT', 'CERTIFICATION', 'RESEARCH_PAPER', 'PATENT', 'INTERNSHIP']),
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
  }
}
