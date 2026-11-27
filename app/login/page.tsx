import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { Layers3 } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { SessionSwitchPrompt } from '@/components/session-switch-prompt'
import { authOptions } from '@/lib/auth'

const portalByRole: Record<string, string> = {
  STUDENT: '/student',
  FACULTY: '/faculty',
  INSTITUTION_ADMIN: '/admin',
  DEPARTMENT_COORDINATOR: '/admin/verifications',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  const hasActiveSession = Boolean(session?.user?.id && session?.user?.roleKey)

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-7 shadow-sm sm:p-9">
        <Link href="/" className="inline-flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Layers3 aria-hidden="true" size={19} />
          </span>
          <span className="text-xl font-semibold tracking-tight">attainly</span>
        </Link>
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Your campus workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in with your institution account.</p>
        </div>

        {params.error === 'auth-config' && (
          <p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Sessions are not configured. Set NEXTAUTH_SECRET or AUTH_SECRET before signing in.
          </p>
        )}

        {hasActiveSession && session?.user ? (
          <div className="mt-6">
            <SessionSwitchPrompt
              name={session.user.name ?? session.user.email ?? ''}
              roleKey={session.user.roleKey}
              portalUrl={portalByRole[session.user.roleKey] ?? '/'}
            />
          </div>
        ) : (
          <div className="mt-7">
            <LoginForm />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">Attainly engineering college portal</p>
      </div>
    </main>
  )
}
