import { PortalDashboard } from '@/components/portal-dashboard'
import { CoursesCatalog } from '@/components/courses-catalog'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { prisma } from '@/lib/server/db'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionCourses } from '@/lib/server/services/department'

const departmentRepository = new PrismaDepartmentRepository()

export default async function StudentCoursesPage() {
  const principal = await getCurrentPrincipal()

  const [courses, departments, studentProfile] = await Promise.all([
    listInstitutionCourses({ principal, repository: departmentRepository }),
    prisma.department.findMany({
      where: { institutionId: principal.institutionId },
      include: { _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId: principal.institutionId, userId: principal.userId } },
      include: { department: true },
    }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={
        <CoursesCatalog
          courses={courses}
          departments={departments}
          userDepartmentName={studentProfile?.department?.name}
        />
      }
    />
  )
}
