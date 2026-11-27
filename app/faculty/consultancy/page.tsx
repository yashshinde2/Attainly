import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyConsultancySection } from '@/components/faculty/consultancy-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { listOwnConsultancies } from '@/lib/server/services/faculty-portfolio'

export default async function FacultyConsultancyPage() {
  const principal = await getCurrentPrincipal()
  const consultancies = await listOwnConsultancies(principal)

  return (
    <PortalDashboard
      portal="faculty"
      content={<FacultyConsultancySection consultancies={consultancies} />}
    />
  )
}
