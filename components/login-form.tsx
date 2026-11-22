'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(email: string, password: string) {
    setPending(true)
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
        return
      }

      router.replace(result.url ?? targetUrl)
      router.refresh()
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again.')
    } finally {
      setPending(false)
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
          className="mt-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          1-Click Demo Accounts
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleLogin('admin@attainly.demo', 'AttainlyDemo!2026')}
            className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 text-left transition hover:bg-muted"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Alex Admin (Institution Admin)</p>
              <p className="text-[11px] text-muted-foreground">admin@attainly.demo</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              /admin
            </span>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleLogin('faculty@attainly.demo', 'AttainlyDemo!2026')}
            className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 text-left transition hover:bg-muted"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Frankie Faculty (Faculty Portal)</p>
              <p className="text-[11px] text-muted-foreground">faculty@attainly.demo</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              /faculty
            </span>
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleLogin('student@attainly.demo', 'AttainlyDemo!2026')}
            className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 text-left transition hover:bg-muted"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Sam Student (Student Portal)</p>
              <p className="text-[11px] text-muted-foreground">student@attainly.demo</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              /student
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
