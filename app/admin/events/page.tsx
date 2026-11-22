import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminEventsWorkspace } from '@/components/admin-events-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { listInstitutionEvents } from '@/lib/server/services/event'
import { listInstitutionUsers } from '@/lib/server/services/institution-user'

const departmentRepository = new PrismaDepartmentRepository()
const eventRepository = new PrismaEventRepository()
const userRepository = new PrismaInstitutionUserRepository()

export default async function AdminEventsPage() {
  const principal = await getCurrentPrincipal()
  const [departments, events, users] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionEvents({ principal, repository: eventRepository }),
    listInstitutionUsers({ principal, repository: userRepository }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminEventsWorkspace
          departments={departments}
          events={events}
          users={users}
        />
      }
    />
  )
}
