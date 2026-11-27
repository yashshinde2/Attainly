import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'
import { getPortalShellContext } from '@/lib/server/portal-shell-data'

export default async function AdminPortalLayout({ children }: { children: ReactNode }) {
  const ctx = await getPortalShellContext('admin')
  return <AppShell {...ctx}>{children}</AppShell>
}
