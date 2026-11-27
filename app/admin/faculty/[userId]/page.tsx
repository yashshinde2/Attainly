import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminFacultyPortfolioView } from '@/components/admin/faculty-portfolio-view'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getAdminFacultyPortfolio } from '@/lib/server/services/admin-command'

export default async function AdminFacultyPortfolioPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const principal = await getCurrentPrincipal()
  const { profile, canonicalPublications, documents } = await getAdminFacultyPortfolio({ principal, userId })

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminFacultyPortfolioView
          profile={profile}
          canonicalPublications={canonicalPublications}
          documents={documents}
        />
      }
    />
  )
}
