import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentProjectsInternshipsSection } from '@/components/student/projects-internships-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentInternshipRepository } from '@/lib/server/repositories/student-internship-repository'
import { PrismaStudentProjectRepository } from '@/lib/server/repositories/student-project-repository'
import { readOwnStudentInternships, readOwnStudentProjects } from '@/lib/server/services/student'

const projectRepository = new PrismaStudentProjectRepository()
const internshipRepository = new PrismaStudentInternshipRepository()

export default async function StudentProjectsPage() {
  const principal = await getCurrentPrincipal()
  const [projects, internships] = await Promise.all([
    readOwnStudentProjects({ principal, repository: projectRepository }),
    readOwnStudentInternships({ principal, repository: internshipRepository }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={<StudentProjectsInternshipsSection projects={projects} internships={internships} />}
    />
  )
}
