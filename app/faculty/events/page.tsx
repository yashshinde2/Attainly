import { PortalDashboard } from '@/components/portal-dashboard'
import { EventsCatalog } from '@/components/events-catalog'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { listDiscoverableEventsForUser, listEventCategories } from '@/lib/server/services/event'
import { getInstitutionBranding } from '@/lib/server/services/institution'
import { prisma } from '@/lib/server/db'

export default async function FacultyEventsPage() {
  const principal = await getCurrentPrincipal()
  const [events, categories, branding, user] = await Promise.all([
    listDiscoverableEventsForUser(principal),
    listEventCategories(principal),
    getInstitutionBranding(principal),
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
          institutionName={branding.name}
          institutionLogoUrl={branding.logoUrl}
          participantName={user ? `${user.firstName} ${user.lastName}` : 'Faculty Member'}
        />
      }
    />
  )
}
