'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

export function SessionSwitchPrompt({
  name,
  roleKey,
  portalUrl,
}: {
  name: string
  roleKey: string
  portalUrl: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleOpenWorkspace = () => {
    startTransition(() => {
      router.push(portalUrl)
    })
  }

  const roleLabel = roleKey === 'INSTITUTION_ADMIN' ? 'Admin' : roleKey === 'FACULTY' ? 'Faculty' : 'Student'

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
        <button
          type="button"
          disabled={isPending || isSigningOut}
          onClick={handleOpenWorkspace}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] hover:opacity-90 disabled:opacity-80 disabled:cursor-wait"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Opening {roleLabel} Workspace…</span>
            </>
          ) : (
            <span>Open {roleLabel} Workspace &rarr;</span>
          )}
        </button>
        <button
          type="button"
          disabled={isPending || isSigningOut}
          onClick={() => {
            setIsSigningOut(true)
            signOut({ callbackUrl: '/login' })
          }}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {isSigningOut ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Signing out…</span>
            </>
          ) : (
            <span>Sign out &amp; switch account</span>
          )}
        </button>
      </div>
    </div>
  )
}
