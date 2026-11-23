import { PortalDashboard } from '@/components/portal-dashboard'
import { UserManagement } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { listInstitutionUsers, listInstitutionRoles } from '@/lib/server/services/institution-user'

const userRepository = new PrismaInstitutionUserRepository()

export default async function AdminPeoplePage() {
  const principal = await getCurrentPrincipal()

  const [users, roles] = await Promise.all([
    listInstitutionUsers({ principal, repository: userRepository }),
    listInstitutionRoles({ principal, repository: userRepository }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={<UserManagement users={users} roles={roles} />}
    />
  )
}
