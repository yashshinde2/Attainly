import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { getPortalShellContext } from '@/lib/server/portal-shell-data'

export default async function StudentPortalLayout({ children }: { children: ReactNode }) {
  const ctx = await getPortalShellContext('student')
  return <AppShell {...ctx}>{children}</AppShell>
}
