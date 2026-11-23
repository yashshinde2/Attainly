import { PortalDashboard } from '@/components/portal-dashboard'
import { CoursesManagement } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments, listInstitutionCourses } from '@/lib/server/services/department'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()

  const [departments, courses] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionCourses({ principal, repository: departmentRepository }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <CoursesManagement
          courses={courses}
          departments={departments}
          initialDepartmentId={params.departmentId}
        />
      }
    />
  )
}
