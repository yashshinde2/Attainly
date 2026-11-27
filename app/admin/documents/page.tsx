import { PortalDashboard } from '@/components/portal-dashboard'
import { DocumentVaultClient } from '@/components/admin/document-vault'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { listDocumentVault } from '@/lib/server/services/document-vault'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; departmentId?: string; ownerRole?: string; entityType?: string; page?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()
  const [vault, departments] = await Promise.all([
    listDocumentVault(principal, {
      search: params.search,
      departmentId: params.departmentId,
      ownerRole: (params.ownerRole as 'STUDENT' | 'FACULTY' | 'ADMIN' | '') ?? '',
      entityType: params.entityType,
      page: params.page ? Number(params.page) : 1,
    }),
    listInstitutionDepartments({ principal, repository: departmentRepository }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <DocumentVaultClient
          vault={vault}
          departments={departments}
          initialFilters={{
            search: params.search ?? '',
            departmentId: params.departmentId ?? '',
            ownerRole: params.ownerRole ?? '',
            entityType: params.entityType ?? '',
          }}
        />
      }
    />
  )
}
