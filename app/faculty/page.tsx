import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyOverviewDashboard } from '@/components/faculty/overview-dashboard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getFacultyOverviewData } from '@/lib/server/services/faculty-portfolio'

export default async function FacultyPortalPage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const data = await getFacultyOverviewData(principal)

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <FacultyOverviewDashboard
          facultyName={session?.user?.name ?? 'Faculty'}
          email={session?.user?.email ?? ''}
          data={data}
        />
      }
    />
  )
}
