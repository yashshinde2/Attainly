import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentNotificationsSection } from '@/components/student/notifications-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getStudentNotifications } from '@/lib/server/services/student-overview'

export default async function StudentNotificationsPage() {
  const principal = await getCurrentPrincipal()
  const notifications = await getStudentNotifications({ principal })

  return (
    <PortalDashboard
      portal="student"
      content={<StudentNotificationsSection notifications={notifications} />}
    />
  )
}
