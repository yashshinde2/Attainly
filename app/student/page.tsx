import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentOverviewDashboard } from '@/components/student/overview-dashboard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getStudentOverviewData } from '@/lib/server/services/student-overview'
import { getExpiringCertificationsForStudent } from '@/lib/server/services/document-intelligence'

export default async function StudentPortalPage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const [data, expiringCredentials] = await Promise.all([
    getStudentOverviewData({ principal }),
    getExpiringCertificationsForStudent({
      institutionId: principal.institutionId,
      userId: principal.userId,
      daysAhead: 60,
    }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={
        <StudentOverviewDashboard
          studentName={session?.user?.name ?? 'Student'}
          email={session?.user?.email ?? ''}
          data={data}
          expiringCredentials={expiringCredentials}
        />
      }
    />
  )
}
