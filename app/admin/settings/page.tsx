import { PortalDashboard } from '@/components/portal-dashboard'
import { InstitutionSettingsManagement } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getInstitutionSettings } from '@/lib/server/services/institution'
import { listAcademicYears, listBatches } from '@/lib/server/services/admin-command'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionCourses, listInstitutionDepartments } from '@/lib/server/services/department'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminSettingsPage() {
  const principal = await getCurrentPrincipal()
  const [{ institution, logoUrl, criteria }, academicYears, batches, departments, courses] = await Promise.all([
    getInstitutionSettings({ principal }),
    listAcademicYears(principal),
    listBatches(principal),
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listInstitutionCourses({ principal, repository: departmentRepository }),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <InstitutionSettingsManagement
          institution={institution}
          logoUrl={logoUrl}
          criteria={criteria}
          academicYears={academicYears}
          batches={batches}
          departments={departments}
          courses={courses}
        />
      }
    />
  )
}
