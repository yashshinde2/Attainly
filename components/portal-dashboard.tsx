'use client'

import type { ReactNode } from 'react'
import { usePortalShellActive } from '@/components/app-shell'

type Portal = 'student' | 'faculty' | 'admin'

/**
 * Legacy wrapper preserved for page compatibility.
 * When mounted inside a portal layout (`AppShell`), passes `content` directly
 * without remounting the persistent sidebar/header or duplicating page headers.
 */
export function PortalDashboard({ content }: { portal: Portal; content?: ReactNode }) {
  const insideShell = usePortalShellActive()
  if (insideShell) {
    return <>{content}</>
  }
  return <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{content}</div>
}
