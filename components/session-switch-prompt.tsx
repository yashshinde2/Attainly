'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'

export function SessionSwitchPrompt({
  name,
  roleKey,
  portalUrl,
}: {
  name: string
  roleKey: string
  portalUrl: string
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active session</p>
        <p className="mt-1 text-base font-semibold text-foreground">{name}</p>
        <span className="mt-1.5 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {roleKey}
        </span>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Link
          href={portalUrl}
          className="rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Open {roleKey === 'INSTITUTION_ADMIN' ? 'Admin' : roleKey === 'FACULTY' ? 'Faculty' : 'Student'} Workspace &rarr;
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          Sign out &amp; switch account
        </button>
      </div>
    </div>
  )
}
