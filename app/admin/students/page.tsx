import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminStudentDirectoryClient } from '@/components/admin/student-directory'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionCourses, listInstitutionDepartments } from '@/lib/server/services/department'
import { listAdminStudentsDirectory } from '@/lib/server/services/admin-command'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()
  const page = Math.max(1, Number(params.page) || 1)

  const [directory, departments, courses] = await Promise.all([
    listAdminStudentsDirectory({
      principal,
      q: params.q,
      departmentId: params.departmentId || undefined,
      courseId: params.courseId || undefined,
      batchYear: params.batchYear ? Number(params.batchYear) : undefined,
      semester: params.semester ? Number(params.semester) : undefined,
      academicStatus: params.academicStatus || undefined,
      placementStatus: params.placementStatus || undefined,
      completenessBand: params.completenessBand || undefined,
      page,
      pageSize: 15,
    }),
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionCourses({ principal, repository: departmentRepository }),
  ])

  const cleanFilters: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v) cleanFilters[k] = v
  }

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminStudentDirectoryClient
          items={directory.items}
          total={directory.total}
          page={directory.page}
          pageSize={directory.pageSize}
          departments={departments}
          courses={courses}
          filters={cleanFilters}
        />
      }
    />
  )
}
