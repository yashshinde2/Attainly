import 'server-only'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'

export interface DocumentVaultFilters {
  search?: string
  departmentId?: string
  ownerRole?: 'STUDENT' | 'FACULTY' | 'ADMIN' | ''
  entityType?: string
  page?: number
  pageSize?: number
}

export async function listDocumentVault(
  principal: AuthenticatedPrincipal,
  filters: DocumentVaultFilters = {},
) {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)
  if (filters.departmentId) assertDepartmentAccess(allowedDepts, filters.departmentId)

  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100)
  const page = Math.max(filters.page ?? 1, 1)

  const docs = await prisma.document.findMany({
    where: {
      institutionId,
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.search
        ? {
            OR: [
              { originalFilename: { contains: filters.search, mode: 'insensitive' } },
              { entityType: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      owner: {
        ...(filters.ownerRole ? { role: { key: filters.ownerRole } } : {}),
        ...(filters.departmentId
          ? {
              OR: [
                { student: { departmentId: filters.departmentId } },
                { faculty: { departmentId: filters.departmentId } },
              ],
            }
          : allowedDepts
            ? {
                OR: [
                  { student: { departmentId: { in: allowedDepts } } },
                  { faculty: { departmentId: { in: allowedDepts } } },
                ],
              }
            : {}),
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: { select: { key: true } },
          student: { select: { department: { select: { id: true, code: true, name: true } } } },
          faculty: { select: { department: { select: { id: true, code: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const total = docs.length
  const start = (page - 1) * pageSize
  const items = docs.slice(start, start + pageSize).map((d) => {
    const dept = d.owner.student?.department ?? d.owner.faculty?.department ?? null
    return {
      id: d.id,
      originalFilename: d.originalFilename,
      pathname: d.pathname,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      sha256: d.sha256,
      entityType: d.entityType ?? 'GENERAL',
      entityId: d.entityId,
      version: d.version,
      parentDocumentId: d.parentDocumentId,
      createdAt: d.createdAt,
      ownerName: `${d.owner.firstName} ${d.owner.lastName}`,
      ownerEmail: d.owner.email,
      ownerRole: d.owner.role.key,
      departmentCode: dept?.code ?? 'Unassigned',
      departmentName: dept?.name ?? 'Unassigned',
    }
  })

  return { items, total, page, pageSize }
}
