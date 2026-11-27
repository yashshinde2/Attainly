import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentNotificationsSection } from '@/components/student/notifications-section'
import { DataRequestsPanel } from '@/components/shared/data-requests-panel'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getStudentNotifications } from '@/lib/server/services/student-overview'
import { listMyDataRequests } from '@/lib/server/services/data-requests'

export default async function StudentNotificationsPage() {
  const principal = await getCurrentPrincipal()
  const [notifications, dataRequests] = await Promise.all([
    getStudentNotifications({ principal }),
    listMyDataRequests(principal),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={
        <>
          <DataRequestsPanel requests={dataRequests} />
          <StudentNotificationsSection notifications={notifications} />
        </>
      }
    />
  )
}
