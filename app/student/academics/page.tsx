import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentAcademicsSection } from '@/components/student/academics-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentEducationRepository } from '@/lib/server/repositories/student-education-repository'
import { PrismaStudentSemesterRepository } from '@/lib/server/repositories/student-semester-repository'
import { readOwnStudentEducation, readOwnStudentSemesters } from '@/lib/server/services/student'

const educationRepository = new PrismaStudentEducationRepository()
const semesterRepository = new PrismaStudentSemesterRepository()

export default async function StudentAcademicsPage() {
  const principal = await getCurrentPrincipal()
  const [semesters, education] = await Promise.all([
    readOwnStudentSemesters({ principal, repository: semesterRepository }),
    readOwnStudentEducation({ principal, repository: educationRepository }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={<StudentAcademicsSection semesters={semesters} education={education} />}
    />
  )
}
