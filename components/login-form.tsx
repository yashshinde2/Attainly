'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    try {
      const result = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        callbackUrl: '/student',
        redirect: false,
      })
      if (!result || result.error) {
        setError('Email or password was not recognized.')
        return
      }
      router.replace(result.url ?? '/student')
      router.refresh()
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div><label htmlFor="email" className="text-sm font-medium">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" /></div>
      <div><label htmlFor="password" className="text-sm font-medium">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={pending} className="mt-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
