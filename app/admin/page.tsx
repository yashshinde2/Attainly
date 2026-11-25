import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminWorkspace } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { listInstitutionDepartments, listInstitutionCourses } from '@/lib/server/services/department'
import { listInstitutionEvents } from '@/lib/server/services/event'
import { listInstitutionUsers, listInstitutionRoles } from '@/lib/server/services/institution-user'
import { listPendingForInstitution } from '@/lib/server/services/verification'
import { getAdminAttentionInsights } from '@/lib/server/services/reports'

const departmentRepository = new PrismaDepartmentRepository()
const userRepository = new PrismaInstitutionUserRepository()
const eventRepository = new PrismaEventRepository()

export default async function AdminPortalPage() {
  const principal = await getCurrentPrincipal()
  const [departments, users, roles, events, pendingVerifications, courses, attentionInsights] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionUsers({ principal, repository: userRepository }),
    listInstitutionRoles({ principal, repository: userRepository }),
    listInstitutionEvents({ principal, repository: eventRepository }),
    listPendingForInstitution({ principal }),
    listInstitutionCourses({ principal, repository: departmentRepository }),
    getAdminAttentionInsights({ principal }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminWorkspace
          departments={departments}
          users={users}
          roles={roles}
          events={events}
          pendingVerifications={pendingVerifications}
          courseCount={courses.length}
          attentionInsights={attentionInsights}
        />
      }
    />
  )
}
