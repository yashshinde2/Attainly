import { PortalDashboard } from '@/components/portal-dashboard'
import { ReportPackagesCenter } from '@/components/admin/report-packages-center'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { requirePermission } from '@/lib/server/authorization'
import { prisma } from '@/lib/server/db'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import { listAcademicYears, resolveDepartmentScope } from '@/lib/server/services/admin-command'

const departmentRepository = new PrismaDepartmentRepository()

export default async function AdminReportPackagesPage() {
  const principal = await getCurrentPrincipal()
  requirePermission(principal, 'report:view')

  const scope = await resolveDepartmentScope(principal)

  const [departments, academicYears, studentUsers, facultyUsers] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listAcademicYears(principal),
    prisma.user.findMany({
      where: {
        institutionId: principal.institutionId,
        isActive: true,
        student: {
          is: {
            ...(scope ? { departmentId: { in: scope } } : {}),
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        student: {
          select: {
            enrollmentNumber: true,
            departmentId: true,
            department: { select: { code: true } },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 300,
    }),
    prisma.user.findMany({
      where: {
        institutionId: principal.institutionId,
        isActive: true,
        faculty: {
          is: {
            ...(scope ? { departmentId: { in: scope } } : {}),
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        faculty: {
          select: {
            designation: true,
            departmentId: true,
            department: { select: { code: true } },
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 300,
    }),
  ])

  const students = studentUsers.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    subtitle: `${u.student?.enrollmentNumber ?? u.email} • ${u.student?.department?.code ?? 'Unassigned'}`,
    departmentId: u.student?.departmentId ?? null,
  }))

  const faculty = facultyUsers.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    subtitle: `${u.faculty?.designation ?? 'Faculty'} • ${u.faculty?.department?.code ?? 'Unassigned'}`,
    departmentId: u.faculty?.departmentId ?? null,
  }))

  return (
    <PortalDashboard
      portal="admin"
      content={
        <ReportPackagesCenter
          departments={departments}
          academicYears={academicYears}
          students={students}
          faculty={faculty}
        />
      }
    />
  )
}
