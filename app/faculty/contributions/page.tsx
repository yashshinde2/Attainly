import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyContributionsSection } from '@/components/faculty/contributions-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { listOwnContributions } from '@/lib/server/services/faculty-portfolio'

export default async function FacultyContributionsPage() {
  const principal = await getCurrentPrincipal()
  const contributions = await listOwnContributions(principal)

  return (
    <PortalDashboard
      portal="faculty"
      content={<FacultyContributionsSection contributions={contributions} />}
    />
  )
}
