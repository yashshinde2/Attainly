import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminActionCenter } from '@/components/admin/action-center'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getAdminActionCenterData } from '@/lib/server/services/admin-action-center'

export default async function AdminActionCenterPage() {
  const principal = await getCurrentPrincipal()
  const data = await getAdminActionCenterData(principal)

  return (
    <PortalDashboard
      portal="admin"
      content={<AdminActionCenter data={data} />}
    />
  )
}
