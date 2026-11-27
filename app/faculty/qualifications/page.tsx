import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyQualificationsSection } from '@/components/faculty/qualifications-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaFacultyEducationRepository } from '@/lib/server/repositories/faculty-education-repository'
import { listOwnFacultyEducation } from '@/lib/server/services/faculty'

const educationRepository = new PrismaFacultyEducationRepository()

export default async function FacultyQualificationsPage() {
  const principal = await getCurrentPrincipal()
  const education = await listOwnFacultyEducation({ principal, repository: educationRepository })

  return (
    <PortalDashboard
      portal="faculty"
      content={<FacultyQualificationsSection education={education} />}
    />
  )
}
