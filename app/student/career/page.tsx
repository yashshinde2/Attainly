import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentCareerSection } from '@/components/student/career-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { listOwnPlacementOffers, readOwnGraduateOutcome } from '@/lib/server/services/student-career'

export default async function StudentCareerPage() {
  const principal = await getCurrentPrincipal()
  const [offers, outcome] = await Promise.all([
    listOwnPlacementOffers({ principal }),
    readOwnGraduateOutcome({ principal }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={<StudentCareerSection offers={offers} outcome={outcome} />}
    />
  )
}
