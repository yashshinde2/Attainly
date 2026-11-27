import { PortalDashboard } from '@/components/portal-dashboard'
import { EventsCatalog } from '@/components/events-catalog'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { listDiscoverableEventsForUser, listEventCategories } from '@/lib/server/services/event'
import { getInstitutionSettings } from '@/lib/server/services/institution'
import { prisma } from '@/lib/server/db'

export default async function FacultyEventsPage() {
  const principal = await getCurrentPrincipal()
  const [events, categories, { institution, logoUrl }, user] = await Promise.all([
    listDiscoverableEventsForUser(principal),
    listEventCategories(principal),
    getInstitutionSettings({ principal }),
    prisma.user.findUnique({
      where: { institutionId_id: { institutionId: principal.institutionId, id: principal.userId } },
      select: { firstName: true, lastName: true },
    }),
  ])

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <EventsCatalog
          events={events}
          categories={categories}
          portalRole="faculty"
          institutionName={institution.name}
          institutionLogoUrl={logoUrl}
          participantName={user ? `${user.firstName} ${user.lastName}` : 'Faculty Member'}
        />
      }
    />
  )
}
