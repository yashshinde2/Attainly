import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentNotificationsSection } from '@/components/student/notifications-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getFacultyNotifications } from '@/lib/server/services/faculty-portfolio'

export default async function FacultyNotificationsPage() {
  const principal = await getCurrentPrincipal()
  const notifications = await getFacultyNotifications(principal)

  return (
    <PortalDashboard
      portal="faculty"
      content={<StudentNotificationsSection notifications={notifications} />}
    />
  )
}
