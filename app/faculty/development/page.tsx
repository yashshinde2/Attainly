import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyDevelopmentSection } from '@/components/faculty/development-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaFacultyCertificationRepository } from '@/lib/server/repositories/faculty-certification-repository'
import { listOwnFacultyCertifications } from '@/lib/server/services/faculty'
import { listOwnFdps } from '@/lib/server/services/faculty-portfolio'

const certificationRepository = new PrismaFacultyCertificationRepository()

export default async function FacultyDevelopmentPage() {
  const principal = await getCurrentPrincipal()
  const [fdps, certifications] = await Promise.all([
    listOwnFdps(principal),
    listOwnFacultyCertifications({ principal, repository: certificationRepository }),
  ])

  return (
    <PortalDashboard
      portal="faculty"
      content={<FacultyDevelopmentSection fdps={fdps} certifications={certifications} />}
    />
  )
}
