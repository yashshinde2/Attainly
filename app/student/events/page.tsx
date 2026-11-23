import { PortalDashboard } from '@/components/portal-dashboard'
import { EventsCatalog } from '@/components/events-catalog'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import { listInstitutionEvents } from '@/lib/server/services/event'

const eventRepository = new PrismaEventRepository()

export default async function StudentEventsPage() {
  const principal = await getCurrentPrincipal()
  const events = await listInstitutionEvents({ principal, repository: eventRepository })

  return (
    <PortalDashboard
      portal="student"
      content={<EventsCatalog events={events} portalRole="student" />}
    />
  )
}
