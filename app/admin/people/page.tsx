import { PortalDashboard } from '@/components/portal-dashboard'
import { UserManagement } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionUsers, listInstitutionRoles } from '@/lib/server/services/institution-user'
import { listInstitutionDepartments, listInstitutionCourses } from '@/lib/server/services/department'

const userRepository = new PrismaInstitutionUserRepository()
const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminPeoplePage() {
  const principal = await getCurrentPrincipal()

  const [users, roles, departments, courses] = await Promise.all([
    listInstitutionUsers({ principal, repository: userRepository }),
    listInstitutionRoles({ principal, repository: userRepository }),
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionCourses({ principal, repository: departmentRepository }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <UserManagement
          users={users}
          roles={roles}
          departments={departments}
          courses={courses}
        />
      }
    />
  )
}
