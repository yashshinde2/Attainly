import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminFacultyDirectoryClient } from '@/components/admin/faculty-directory'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { listAdminFacultyDirectory } from '@/lib/server/services/admin-command'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminFacultyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()
  const page = Math.max(1, Number(params.page) || 1)

  const [directory, departments] = await Promise.all([
    listAdminFacultyDirectory({
      principal,
      q: params.q,
      departmentId: params.departmentId || undefined,
      designation: params.designation || undefined,
      qualification: params.qualification || undefined,
      employmentStatus: params.employmentStatus || undefined,
      minExperience: params.minExperience ? Number(params.minExperience) : undefined,
      hasContributions: params.hasContributions === '1',
      page,
      pageSize: 15,
    }),
    listInstitutionDepartments({ principal, repository: departmentRepository }),
  ])

  const cleanFilters: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v) cleanFilters[k] = v
  }

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminFacultyDirectoryClient
          items={directory.items}
          total={directory.total}
          page={directory.page}
          pageSize={directory.pageSize}
          departments={departments}
          filters={cleanFilters}
        />
      }
    />
  )
}
