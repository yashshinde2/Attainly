import { PortalDashboard } from '@/components/portal-dashboard'
import { InspectionCenterClient } from '@/components/admin/inspection-center'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { listInstitutionUsers } from '@/lib/server/services/institution-user'
import { listAcademicYears } from '@/lib/server/services/admin-command'
import { listInspectionCollections } from '@/lib/server/services/inspection'
import { listExportJobs } from '@/lib/server/services/export-jobs'
import { listAdminDataRequests } from '@/lib/server/services/data-requests'
import { listDocumentVault } from '@/lib/server/services/document-vault'

const departmentRepository = new PrismaDepartmentRepository()
const userRepository = new PrismaInstitutionUserRepository()

export default async function AdminInspectionsPage() {
  const principal = await getCurrentPrincipal()
  const [collections, dataRequests, departments, academicYears, users, vault, exportJobs] = await Promise.all([
    listInspectionCollections(principal),
    listAdminDataRequests(principal),
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listAcademicYears(principal),
    listInstitutionUsers({ principal, repository: userRepository }),
    listDocumentVault(principal, { page: 1, pageSize: 50 }),
    listExportJobs(principal, 20),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <InspectionCenterClient
          collections={collections}
          initialExportJobs={exportJobs}
          dataRequests={dataRequests}
          departments={departments}
          academicYears={academicYears}
          users={users.filter((u) => u.isActive && u.role.key !== 'INSTITUTION_ADMIN')}
          documents={vault.items}
        />
      }
    />
  )
}
