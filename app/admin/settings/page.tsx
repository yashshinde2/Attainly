import { PortalDashboard } from '@/components/portal-dashboard'
import { InstitutionSettingsManagement } from '@/components/admin-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getInstitutionSettings } from '@/lib/server/services/institution'

export default async function AdminSettingsPage() {
  const principal = await getCurrentPrincipal()
  const { institution, logoUrl, criteria } = await getInstitutionSettings({ principal })

  return (
    <PortalDashboard
      portal="admin"
      content={
        <InstitutionSettingsManagement
          institution={institution}
          logoUrl={logoUrl}
          criteria={criteria}
        />
      }
    />
  )
}
