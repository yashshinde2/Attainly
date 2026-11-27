import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentOverviewDashboard } from '@/components/student/overview-dashboard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getStudentOverviewData } from '@/lib/server/services/student-overview'

export default async function StudentPortalPage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const data = await getStudentOverviewData({ principal })

  return (
    <PortalDashboard
      portal="student"
      content={
        <StudentOverviewDashboard
          studentName={session?.user?.name ?? 'Student'}
          email={session?.user?.email ?? ''}
          data={data}
        />
      }
    />
  )
}
