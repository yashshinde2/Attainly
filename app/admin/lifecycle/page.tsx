import { PortalDashboard } from '@/components/portal-dashboard'
import { LifecycleCenter } from '@/components/admin/lifecycle-center'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getLifecycleWorkspaceData } from '@/lib/server/services/lifecycle'

export default async function AdminLifecyclePage() {
  const principal = await getCurrentPrincipal()
  const data = await getLifecycleWorkspaceData(principal)

  return (
    <PortalDashboard
      portal="admin"
      content={<LifecycleCenter data={data} />}
    />
  )
}
