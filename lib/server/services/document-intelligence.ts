import 'server-only'
import { prisma } from '@/lib/server/db'
import {
  AuthorizationError,
  requirePermission,
  type AuthenticatedPrincipal,
} from '@/lib/server/authorization'
import { resolveDepartmentScope } from './admin-command'
import { canAccessDocument } from '../repositories/document-repository'
import { uploadDocument, type DocumentStorage } from './uploads'

export async function findOwnDocumentBySha256(input: {
  institutionId: string
  ownerUserId: string
  sha256: string
}) {
  const cleanHash = input.sha256.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(cleanHash)) return null
  return prisma.document.findFirst({
    where: {
      institutionId: input.institutionId,
      ownerUserId: input.ownerUserId,
      sha256: cleanHash,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      pathname: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      version: true,
      createdAt: true,
    },
  })
}

export async function listOwnRecentDocuments(input: {
  principal: AuthenticatedPrincipal
  query?: string
  mimeCategory?: 'ALL' | 'PDF' | 'IMAGE'
  limit?: number
}) {
  requirePermission(input.principal, 'document:read_own')
  const q = input.query?.trim()
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50)

  return prisma.document.findMany({
    where: {
      institutionId: input.principal.institutionId,
      ownerUserId: input.principal.userId,
      ...(q
        ? {
            OR: [
              { originalFilename: { contains: q, mode: 'insensitive' } },
              { entityType: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(input.mimeCategory === 'PDF'
        ? { mimeType: 'application/pdf' }
        : input.mimeCategory === 'IMAGE'
          ? { mimeType: { startsWith: 'image/' } }
          : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      pathname: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      entityType: true,
      entityId: true,
      version: true,
      parentDocumentId: true,
      createdAt: true,
    },
  })
}

async function assertDocumentAccessForPrincipal(
  principal: AuthenticatedPrincipal,
  documentId: string,
) {
  const doc = await prisma.document.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: documentId } },
  })
  if (!doc) throw new Error('Document not found.')

  const allowedDepartmentIds = await resolveDepartmentScope(principal)
  let docDepartmentId: string | null = null
  if (Array.isArray(allowedDepartmentIds)) {
    const owner = await prisma.user.findUnique({
      where: { institutionId_id: { institutionId: doc.institutionId, id: doc.ownerUserId } },
      select: {
        student: { select: { departmentId: true } },
        faculty: { select: { departmentId: true } },
      },
    })
    docDepartmentId = owner?.student?.departmentId ?? owner?.faculty?.departmentId ?? null
  }

  if (
    !canAccessDocument({
      principal,
      docInstitutionId: doc.institutionId,
      docOwnerUserId: doc.ownerUserId,
      allowedDepartmentIds,
      docDepartmentId,
    })
  ) {
    throw new AuthorizationError('You do not have permission to access this document.')
  }
  return doc
}

export async function listDocumentVersions(
  principal: AuthenticatedPrincipal,
  documentId: string,
) {
  const doc = await assertDocumentAccessForPrincipal(principal, documentId)
  const rootId = doc.parentDocumentId ?? doc.id

  return prisma.document.findMany({
    where: {
      institutionId: principal.institutionId,
      ownerUserId: doc.ownerUserId,
      OR: [{ id: rootId }, { parentDocumentId: rootId }],
    },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      pathname: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      version: true,
      parentDocumentId: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  })
}

async function resetLinkedRecordVerificationOnEvidenceReplace(input: {
  institutionId: string
  actorUserId: string
  oldPathname: string
  newPathname: string
  newVersion: number
  entityType: string | null
  entityId: string | null
}): Promise<boolean> {
  if (!input.entityType || !input.entityId) return false
  const { institutionId, entityId, oldPathname, newPathname, actorUserId, newVersion } = input
  let wasVerifiedReset = false

  await prisma.$transaction(async (tx) => {
    const logReset = async (itemType: string) => {
      wasVerifiedReset = true
      await tx.verificationAuditLog.create({
        data: {
          institutionId,
          itemType,
          itemId: entityId,
          action: 'EVIDENCE_REPLACED_RESET',
          actorUserId,
          comment: `Evidence replaced with version ${newVersion}; verification reset to PENDING for re-review.`,
        },
      })
    }

    switch (input.entityType) {
      case 'ACHIEVEMENT': {
        const rec = await tx.achievement.findUnique({
          where: { institutionId_id: { institutionId, id: entityId } },
          select: { id: true, documentUrls: true, verificationStatus: true },
        })
        if (!rec) break
        const nextUrls = rec.documentUrls.map((u) => (u === oldPathname ? newPathname : u))
        if (!nextUrls.includes(newPathname)) nextUrls.push(newPathname)
        await tx.achievement.update({
          where: { institutionId_id: { institutionId, id: entityId } },
          data: {
            documentUrls: nextUrls,
            ...(rec.verificationStatus === 'VERIFIED'
              ? { verificationStatus: 'PENDING', verifiedByUserId: null, verifiedAt: null, version: { increment: 1 } }
              : { version: { increment: 1 } }),
          },
        })
        if (rec.verificationStatus === 'VERIFIED') await logReset('ACHIEVEMENT')
        break
      }
      case 'CERTIFICATION': {
        const rec = await tx.studentCertification.findUnique({
          where: { institutionId_id: { institutionId, id: entityId } },
          select: { id: true, verificationStatus: true },
        })
        if (!rec) break
        await tx.studentCertification.update({
          where: { institutionId_id: { institutionId, id: entityId } },
          data: {
            fileUrl: newPathname,
            ...(rec.verificationStatus === 'VERIFIED'
              ? { verificationStatus: 'PENDING', verifiedByUserId: null, verifiedAt: null, version: { increment: 1 } }
              : { version: { increment: 1 } }),
          },
        })
        if (rec.verificationStatus === 'VERIFIED') await logReset('CERTIFICATION')
        break
      }
      case 'INTERNSHIP': {
        const rec = await tx.studentInternship.findUnique({
          where: { institutionId_id: { institutionId, id: entityId } },
          select: { id: true, verificationStatus: true },
        })
        if (!rec) break
        await tx.studentInternship.update({
          where: { institutionId_id: { institutionId, id: entityId } },
          data: {
            evidenceUrl: newPathname,
            ...(rec.verificationStatus === 'VERIFIED'
              ? { verificationStatus: 'PENDING', verifiedByUserId: null, verifiedAt: null, version: { increment: 1 } }
              : { version: { increment: 1 } }),
          },
        })
        if (rec.verificationStatus === 'VERIFIED') await logReset('INTERNSHIP')
        break
      }
      case 'FACULTY_FDP': {
        const rec = await tx.facultyDevelopmentProgram.findUnique({
          where: { institutionId_id: { institutionId, id: entityId } },
          select: { id: true, verificationStatus: true },
        })
        if (!rec) break
        await tx.facultyDevelopmentProgram.update({
          where: { institutionId_id: { institutionId, id: entityId } },
          data: {
            documentUrl: newPathname,
            ...(rec.verificationStatus === 'VERIFIED'
              ? { verificationStatus: 'PENDING', verifiedByUserId: null, verifiedAt: null, version: { increment: 1 } }
              : { version: { increment: 1 } }),
          },
        })
        if (rec.verificationStatus === 'VERIFIED') await logReset('FACULTY_FDP')
        break
      }
      case 'CANONICAL_PUBLICATION': {
        const rec = await tx.canonicalPublication.findUnique({
          where: { institutionId_id: { institutionId, id: entityId } },
          select: { id: true, verificationStatus: true },
        })
        if (!rec) break
        await tx.canonicalPublication.update({
          where: { institutionId_id: { institutionId, id: entityId } },
          data: {
            fileUrl: newPathname,
            ...(rec.verificationStatus === 'VERIFIED'
              ? { verificationStatus: 'PENDING', verifiedByUserId: null, verifiedAt: null, version: { increment: 1 } }
              : { version: { increment: 1 } }),
          },
        })
        if (rec.verificationStatus === 'VERIFIED') await logReset('CANONICAL_PUBLICATION')
        break
      }
      case 'FACULTY_GRANT': {
        const rec = await tx.facultyResearchGrant.findUnique({
          where: { institutionId_id: { institutionId, id: entityId } },
          select: { id: true, verificationStatus: true },
        })
        if (!rec) break
        await tx.facultyResearchGrant.update({
          where: { institutionId_id: { institutionId, id: entityId } },
          data: {
            documentUrl: newPathname,
            ...(rec.verificationStatus === 'VERIFIED'
              ? { verificationStatus: 'PENDING', verifiedByUserId: null, verifiedAt: null, version: { increment: 1 } }
              : { version: { increment: 1 } }),
          },
        })
        if (rec.verificationStatus === 'VERIFIED') await logReset('FACULTY_GRANT')
        break
      }
      case 'FACULTY_CONSULTANCY': {
        const rec = await tx.facultyConsultancy.findUnique({
          where: { institutionId_id: { institutionId, id: entityId } },
          select: { id: true, verificationStatus: true },
        })
        if (!rec) break
        await tx.facultyConsultancy.update({
          where: { institutionId_id: { institutionId, id: entityId } },
          data: {
            documentUrl: newPathname,
            ...(rec.verificationStatus === 'VERIFIED'
              ? { verificationStatus: 'PENDING', verifiedByUserId: null, verifiedAt: null, version: { increment: 1 } }
              : { version: { increment: 1 } }),
          },
        })
        if (rec.verificationStatus === 'VERIFIED') await logReset('FACULTY_CONSULTANCY')
        break
      }
      default:
        break
    }
  })

  return wasVerifiedReset
}

export async function replaceDocumentWithNewVersion(input: {
  principal: AuthenticatedPrincipal
  documentId: string
  file: File
  storage: DocumentStorage
}) {
  requirePermission(input.principal, 'document:upload')
  const existing = await prisma.document.findUnique({
    where: {
      institutionId_id: {
        institutionId: input.principal.institutionId,
        id: input.documentId,
      },
    },
  })
  if (!existing) throw new Error('Document not found.')
  if (existing.ownerUserId !== input.principal.userId) {
    throw new AuthorizationError('Only the document owner can replace this document.')
  }

  const rootId = existing.parentDocumentId ?? existing.id
  const latestAgg = await prisma.document.aggregate({
    where: {
      institutionId: input.principal.institutionId,
      ownerUserId: input.principal.userId,
      OR: [{ id: rootId }, { parentDocumentId: rootId }],
    },
    _max: { version: true },
  })
  const nextVersion = (latestAgg._max.version ?? existing.version) + 1

  const uploaded = await uploadDocument({
    principal: input.principal,
    storage: input.storage,
    file: input.file,
  })

  const created = await prisma.document.create({
    data: {
      institutionId: input.principal.institutionId,
      ownerUserId: input.principal.userId,
      pathname: uploaded.fileUrl,
      originalFilename: uploaded.originalFilename,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      sha256: uploaded.sha256,
      entityType: existing.entityType,
      entityId: existing.entityId,
      version: nextVersion,
      parentDocumentId: rootId,
    },
  })

  const verificationReset = await resetLinkedRecordVerificationOnEvidenceReplace({
    institutionId: input.principal.institutionId,
    actorUserId: input.principal.userId,
    oldPathname: existing.pathname,
    newPathname: created.pathname,
    newVersion: nextVersion,
    entityType: existing.entityType,
    entityId: existing.entityId,
  })

  return { document: created, verificationReset }
}

export interface DuplicateSuggestionItem {
  id: string
  title: string
  subtitle: string
  status: string
}

export async function findPotentialRecordDuplicates(input: {
  principal: AuthenticatedPrincipal
  type: 'ACHIEVEMENT' | 'CERTIFICATION' | 'PUBLICATION'
  title?: string
  issuer?: string
  doi?: string
}): Promise<DuplicateSuggestionItem[]> {
  const { institutionId, userId } = input.principal
  const title = input.title?.trim() ?? ''
  const doi = input.doi?.trim() ?? ''

  if (input.type === 'PUBLICATION') {
    if (title.length < 4 && doi.length < 4) return []
    const matches = await prisma.canonicalPublication.findMany({
      where: {
        institutionId,
        OR: [
          ...(doi.length >= 4 ? [{ doi: { equals: doi, mode: 'insensitive' as const } }] : []),
          ...(title.length >= 4 ? [{ title: { contains: title.slice(0, 60), mode: 'insensitive' as const } }] : []),
        ],
      },
      take: 5,
      select: { id: true, title: true, doi: true, journalOrConference: true, verificationStatus: true },
    })
    return matches.map((m) => ({
      id: m.id,
      title: m.title,
      subtitle: m.doi ? `DOI: ${m.doi}` : m.journalOrConference ?? 'Canonical Publication',
      status: m.verificationStatus,
    }))
  }

  if (title.length < 3) return []
  const profile = await prisma.studentProfile.findUnique({
    where: { institutionId_userId: { institutionId, userId } },
    select: { id: true },
  })
  if (!profile) return []

  if (input.type === 'ACHIEVEMENT') {
    const matches = await prisma.achievement.findMany({
      where: {
        institutionId,
        studentProfileId: profile.id,
        title: { contains: title.slice(0, 50), mode: 'insensitive' },
      },
      take: 5,
      select: { id: true, title: true, category: true, awardedAt: true, verificationStatus: true },
    })
    return matches.map((m) => ({
      id: m.id,
      title: m.title,
      subtitle: `${m.category}${m.awardedAt ? ` · ${m.awardedAt.toISOString().slice(0, 10)}` : ''}`,
      status: m.verificationStatus,
    }))
  }

  const matches = await prisma.studentCertification.findMany({
    where: {
      institutionId,
      studentProfileId: profile.id,
      name: { contains: title.slice(0, 50), mode: 'insensitive' },
    },
    take: 5,
    select: { id: true, name: true, issuer: true, verificationStatus: true },
  })
  return matches.map((m) => ({
    id: m.id,
    title: m.name,
    subtitle: m.issuer ?? 'Certification',
    status: m.verificationStatus,
  }))
}

export interface ExpiringCredentialItem {
  id: string
  name: string
  issuer: string | null
  expiresAt: Date
  daysRemaining: number
  isExpired: boolean
  verificationStatus: string
}

export async function getExpiringCertificationsForStudent(input: {
  institutionId: string
  userId: string
  daysAhead?: number
}): Promise<{ expired: ExpiringCredentialItem[]; expiringSoon: ExpiringCredentialItem[] }> {
  const daysAhead = input.daysAhead ?? 60
  const profile = await prisma.studentProfile.findUnique({
    where: { institutionId_userId: { institutionId: input.institutionId, userId: input.userId } },
    select: { id: true },
  })
  if (!profile) return { expired: [], expiringSoon: [] }

  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  const certs = await prisma.studentCertification.findMany({
    where: {
      institutionId: input.institutionId,
      studentProfileId: profile.id,
      expiresAt: { not: null, lte: cutoff },
    },
    orderBy: { expiresAt: 'asc' },
    select: { id: true, name: true, issuer: true, expiresAt: true, verificationStatus: true },
  })

  const now = Date.now()
  const expired: ExpiringCredentialItem[] = []
  const expiringSoon: ExpiringCredentialItem[] = []

  for (const c of certs) {
    if (!c.expiresAt) continue
    const daysRemaining = Math.ceil((c.expiresAt.getTime() - now) / (24 * 60 * 60 * 1000))
    const item: ExpiringCredentialItem = {
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      expiresAt: c.expiresAt,
      daysRemaining,
      isExpired: daysRemaining < 0,
      verificationStatus: c.verificationStatus,
    }
    if (daysRemaining < 0) expired.push(item)
    else expiringSoon.push(item)
  }

  return { expired, expiringSoon }
}
