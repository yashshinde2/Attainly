import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { getPortalShellContext } from '@/lib/server/portal-shell-data'

export default async function FacultyPortalLayout({ children }: { children: ReactNode }) {
  const ctx = await getPortalShellContext('faculty')
  return <AppShell {...ctx}>{children}</AppShell>
}
