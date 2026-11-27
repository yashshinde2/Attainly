import { PortalDashboard } from '@/components/portal-dashboard'
import { DepartmentManagement } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { listInstitutionUsers } from '@/lib/server/services/institution-user'

const departmentRepository = new PrismaDepartmentRepository()
const userRepository = new PrismaInstitutionUserRepository()

export default async function AdminDepartmentsPage() {
  const principal = await getCurrentPrincipal()
  const [departments, users] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionUsers({ principal, repository: userRepository }),
  ])

  const coordinators = users
    .filter((u) => u.isActive && u.role.key !== 'STUDENT')
    .map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      roleKey: u.role.key,
    }))

  return (
    <PortalDashboard
      portal="admin"
      content={<DepartmentManagement departments={departments} coordinators={coordinators} />}
    />
  )
}
