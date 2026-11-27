import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminReportsWorkspace } from '@/components/admin-reports-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { listSavedReports } from '@/lib/server/services/reports'
import { listReportSnapshots, runStudioReport } from '@/lib/server/services/report-studio'
import { listAcademicYears } from '@/lib/server/services/admin-command'
import { REPORT_REGISTRY, type ReportEntityType } from '@/lib/reporting-registry'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()

  const requestedType =
    params.type && params.type in REPORT_REGISTRY ? (params.type as ReportEntityType) : null

  const [departments, academicYears, savedReports, snapshots, initialReport] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listAcademicYears(principal),
    listSavedReports({ principal }),
    listReportSnapshots(principal),
    requestedType ? runStudioReport(principal, requestedType, {}) : Promise.resolve(null),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminReportsWorkspace
          departments={departments}
          academicYears={academicYears}
          initialSavedReports={savedReports}
          initialSnapshots={snapshots}
          initialReport={initialReport}
        />
      }
    />
  )
}
