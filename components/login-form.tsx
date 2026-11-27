'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [activeRole, setActiveRole] = useState<'admin' | 'faculty' | 'student' | null>(null)
  const [error, setError] = useState('')

  async function handleLogin(email: string, password: string, role?: 'admin' | 'faculty' | 'student') {
    setPending(true)
    if (role) setActiveRole(role)
    setError('')
    try {
      const explicitCallback = searchParams.get('callbackUrl')
      let targetUrl = explicitCallback
      if (!targetUrl) {
        const lower = email.toLowerCase()
        if (lower.includes('admin')) targetUrl = '/admin'
        else if (lower.includes('faculty')) targetUrl = '/faculty'
        else targetUrl = '/student'
      }

      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: targetUrl,
        redirect: false,
      })

      if (!result || result.error) {
        setError('Email or password was not recognized.')
        setPending(false)
        setActiveRole(null)
        return
      }

      // Use relative same-origin path so login works on localhost, 127.0.0.1, LAN IPs, and custom ports
      // even when NEXTAUTH_URL is unset or differs from the browser origin.
      const safeTarget = targetUrl.startsWith('/') ? targetUrl : '/student'
      window.location.assign(safeTarget)
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again.')
      setPending(false)
      setActiveRole(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')
    await handleLogin(email, password)
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && !activeRole ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="border-t border-border pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1-Click Demo Accounts
          </p>
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            Password: <strong className="text-foreground">AttainlyDemo!2026</strong>
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleLogin('admin@attainly.demo', 'AttainlyDemo!2026', 'admin')}
            className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition active:scale-[0.98] hover:bg-muted ${
              activeRole === 'admin'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-background'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Alex Admin (Institution Admin)</p>
              <p className="text-[11px] text-muted-foreground">admin@attainly.demo</p>
            </div>
            <div className="flex items-center gap-1.5">
              {activeRole === 'admin' ? (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Loader2 size={11} className="animate-spin" /> Opening…
                </span>
              ) : (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  /admin
                </span>
              )}
            </div>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleLogin('faculty@attainly.demo', 'AttainlyDemo!2026', 'faculty')}
            className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition active:scale-[0.98] hover:bg-muted ${
              activeRole === 'faculty'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-background'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Frankie Faculty (Faculty Portal)</p>
              <p className="text-[11px] text-muted-foreground">faculty@attainly.demo</p>
            </div>
            <div className="flex items-center gap-1.5">
              {activeRole === 'faculty' ? (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Loader2 size={11} className="animate-spin" /> Opening…
                </span>
              ) : (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  /faculty
                </span>
              )}
            </div>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleLogin('student@attainly.demo', 'AttainlyDemo!2026', 'student')}
            className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition active:scale-[0.98] hover:bg-muted ${
              activeRole === 'student'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border bg-background'
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Sam Student (Student Portal)</p>
              <p className="text-[11px] text-muted-foreground">student@attainly.demo</p>
            </div>
            <div className="flex items-center gap-1.5">
              {activeRole === 'student' ? (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Loader2 size={11} className="animate-spin" /> Opening…
                </span>
              ) : (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  /student
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
