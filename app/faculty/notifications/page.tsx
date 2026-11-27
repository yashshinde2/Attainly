import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentNotificationsSection } from '@/components/student/notifications-section'
import { DataRequestsPanel } from '@/components/shared/data-requests-panel'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getFacultyNotifications } from '@/lib/server/services/faculty-portfolio'
import { listMyDataRequestsWithOptions } from '@/lib/server/services/data-requests'

export default async function FacultyNotificationsPage() {
  const principal = await getCurrentPrincipal()
  const [notifications, reqData] = await Promise.all([
    getFacultyNotifications(principal),
    listMyDataRequestsWithOptions(principal),
  ])

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <>
          <DataRequestsPanel
            requests={reqData.requests}
            myDocuments={reqData.myDocuments}
            myRecords={reqData.myRecords}
          />
          <StudentNotificationsSection notifications={notifications} />
        </>
      }
    />
  )
}
