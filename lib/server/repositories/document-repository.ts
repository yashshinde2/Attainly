import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Document } from '@/generated/prisma/client'
import { AuthorizationError, type AuthenticatedPrincipal } from '../authorization'

export interface CreateDocumentInput {
  institutionId: string
  ownerUserId: string
  pathname: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  sha256?: string | null
  entityType?: string | null
  entityId?: string | null
}

/**
 * Pure authorization check for document access:
 * - Same institution required
 * - Either owner with `document:read_own` OR authorized reviewer with `record:verify`
 * - If `allowedDepartmentIds` is an array (e.g. DEPARTMENT_COORDINATOR), reviewer access
 *   is strictly restricted to documents belonging to those departments (deny by default if null).
 */
export function canAccessDocument(input: {
  principal: AuthenticatedPrincipal
  docInstitutionId: string
  docOwnerUserId: string
  allowedDepartmentIds?: string[] | null
  docDepartmentId?: string | null
}): boolean {
  if (input.principal.institutionId !== input.docInstitutionId) {
    return false
  }
  const isOwner =
    input.principal.userId === input.docOwnerUserId &&
    input.principal.permissions.includes('document:read_own')
  if (isOwner) return true

  const isReviewer = input.principal.permissions.includes('record:verify')
  if (!isReviewer) return false

  if (Array.isArray(input.allowedDepartmentIds)) {
    return Boolean(input.docDepartmentId && input.allowedDepartmentIds.includes(input.docDepartmentId))
  }

  return true
}

export class PrismaDocumentRepository {
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    return prisma.document.create({
      data: {
        institutionId: input.institutionId,
        ownerUserId: input.ownerUserId,
        pathname: input.pathname,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        sha256: input.sha256 ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    })
  }

  async findByPathname(input: { institutionId: string; pathname: string }): Promise<Document | null> {
    return prisma.document.findUnique({
      where: {
        institutionId_pathname: {
          institutionId: input.institutionId,
          pathname: input.pathname,
        },
      },
    })
  }

  async listByOwnerPaginated(input: {
    institutionId: string
    ownerUserId: string
    query?: string
    page?: number
    pageSize?: number
  }): Promise<{ items: Document[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, input.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 12))
    const q = input.query?.trim()
    const where = {
      institutionId: input.institutionId,
      ownerUserId: input.ownerUserId,
      ...(q
        ? {
            OR: [
              { originalFilename: { contains: q, mode: 'insensitive' as const } },
              { entityType: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ])

    return { items, total, page, pageSize }
  }

  /**
   * Validates that a referenced document path/URL is safe and, if internal,
   * belongs to the current institution and owner. Optionally links entityType/entityId.
   */
  async assertOwnedDocumentReference(input: {
    institutionId: string
    ownerUserId: string
    fileUrl: string | null | undefined
    entityType?: string
    entityId?: string
  }): Promise<void> {
    const url = input.fileUrl?.trim()
    if (!url) return

    if (url.startsWith('institutions/')) {
      const expectedPrefix = `institutions/${input.institutionId}/users/${input.ownerUserId}/`
      if (!url.startsWith(expectedPrefix)) {
        throw new AuthorizationError('Referenced document does not belong to your account.')
      }
      const doc = await this.findByPathname({ institutionId: input.institutionId, pathname: url })
      if (!doc || doc.ownerUserId !== input.ownerUserId) {
        throw new AuthorizationError('Referenced document metadata was not found for your account.')
      }
      if (input.entityType && input.entityId) {
        await prisma.document.update({
          where: { institutionId_id: { institutionId: input.institutionId, id: doc.id } },
          data: { entityType: input.entityType, entityId: input.entityId },
        })
      }
      return
    }

    // External URLs must be http/https
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only HTTP(S) URLs or uploaded documents are allowed.')
      }
    } catch {
      throw new Error('Invalid document URL.')
    }
  }
}
