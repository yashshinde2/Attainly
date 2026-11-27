import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminCommandOverviewClient } from '@/components/admin/command-overview'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { getAdminAttentionInsights } from '@/lib/server/services/reports'
import { getAdminCommandOverview, listAcademicYears } from '@/lib/server/services/admin-command'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ departmentId?: string; academicYear?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()
  const departmentId = params.departmentId?.trim() || undefined
  const academicYearLabel = params.academicYear?.trim() || undefined

  const [departments, academicYears, overview, attentionInsights] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listAcademicYears(principal),
    getAdminCommandOverview({ principal, departmentId, academicYearLabel }),
    getAdminAttentionInsights({ principal }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminCommandOverviewClient
          overview={overview}
          attentionInsights={attentionInsights}
          departments={departments}
          academicYears={academicYears}
          selectedDepartmentId={departmentId}
          selectedAcademicYear={academicYearLabel}
        />
      }
    />
  )
}
