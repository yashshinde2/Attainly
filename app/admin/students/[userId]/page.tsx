import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminStudentDossierView } from '@/components/admin/student-dossier-view'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getAdminStudentDossier } from '@/lib/server/services/admin-command'

export default async function AdminStudentDossierPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const principal = await getCurrentPrincipal()
  const { profile, participations, documents } = await getAdminStudentDossier({ principal, userId })

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminStudentDossierView
          profile={profile}
          participations={participations}
          documents={documents}
        />
      }
    />
  )
}
