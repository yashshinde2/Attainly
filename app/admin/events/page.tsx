import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminEventsWorkspace } from '@/components/admin-events-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import {
  getEventReportsSummary,
  listEventCategories,
  listInstitutionEvents,
} from '@/lib/server/services/event'
import { listInstitutionUsers } from '@/lib/server/services/institution-user'
import { listAcademicYears } from '@/lib/server/services/admin-command'

const departmentRepository = new PrismaDepartmentRepository()
const eventRepository = new PrismaEventRepository()
const userRepository = new PrismaInstitutionUserRepository()

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string; academicYearId?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()
  const [departments, events, users, categories, academicYears, reports] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionEvents({ principal, repository: eventRepository }),
    listInstitutionUsers({ principal, repository: userRepository }),
    listEventCategories(principal),
    listAcademicYears(principal),
    getEventReportsSummary(principal, {
      departmentId: params.departmentId,
      academicYearId: params.academicYearId,
    }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminEventsWorkspace
          departments={departments}
          events={events}
          users={users}
          categories={categories}
          academicYears={academicYears}
          reports={reports}
          activeDepartmentFilter={params.departmentId ?? ''}
          activeAcademicYearFilter={params.academicYearId ?? ''}
        />
      }
    />
  )
}
