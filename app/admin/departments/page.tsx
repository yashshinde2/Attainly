import { PortalDashboard } from '@/components/portal-dashboard'
import { DepartmentManagement } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminDepartmentsPage() {
  const principal = await getCurrentPrincipal()
  const departments = await listInstitutionDepartments({ principal, repository: departmentRepository })

  return (
    <PortalDashboard
      portal="admin"
      content={<DepartmentManagement departments={departments} />}
    />
  )
}
