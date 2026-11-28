import { PortalDashboard } from '@/components/portal-dashboard'
import { ImportCenter } from '@/components/admin/import-center'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { prisma } from '@/lib/server/db'
import { resolveDepartmentScope } from '@/lib/server/services/admin-command'
import { assertCanAccessImportCenter, listImportJobs } from '@/lib/server/services/import-center'

export default async function AdminImportsPage() {
  const principal = await getCurrentPrincipal()
  assertCanAccessImportCenter(principal)

  const [jobs, allowedDepts] = await Promise.all([
    listImportJobs(principal, 25),
    resolveDepartmentScope(principal),
  ])

  const assignedDepartments =
    allowedDepts !== null && allowedDepts.length > 0
      ? await prisma.department.findMany({
          where: { institutionId: principal.institutionId, id: { in: allowedDepts } },
          select: { id: true, code: true, name: true },
          orderBy: { code: 'asc' },
        })
      : []

  return (
    <PortalDashboard
      portal="admin"
      content={
        <ImportCenter
          initialJobs={jobs}
          isInstitutionWideAdmin={allowedDepts === null}
          canVerify={principal.permissions.includes('record:verify')}
          assignedDepartments={assignedDepartments}
        />
      }
    />
  )
}
