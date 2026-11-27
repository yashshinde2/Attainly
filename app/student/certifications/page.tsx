import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentCertificationsSkillsSection } from '@/components/student/certifications-skills-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentCertificationRepository } from '@/lib/server/repositories/student-certification-repository'
import { PrismaStudentSkillRepository } from '@/lib/server/repositories/student-skill-repository'
import { readOwnStudentCertifications, readOwnStudentSkills } from '@/lib/server/services/student'

const certificationRepository = new PrismaStudentCertificationRepository()
const skillRepository = new PrismaStudentSkillRepository()

export default async function StudentCertificationsPage() {
  const principal = await getCurrentPrincipal()
  const [certifications, skills] = await Promise.all([
    readOwnStudentCertifications({ principal, repository: certificationRepository }),
    readOwnStudentSkills({ principal, repository: skillRepository }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={<StudentCertificationsSkillsSection certifications={certifications} skills={skills} />}
    />
  )
}
