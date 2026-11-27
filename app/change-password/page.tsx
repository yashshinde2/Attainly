import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { KeyRound, Layers3 } from 'lucide-react'
import { ChangePasswordForm } from '@/components/change-password-form'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/server/db'

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Check the actual database state for the user
  const dbUser = await prisma.user.findUnique({
    where: {
      institutionId_id: {
        institutionId: session.user.institutionId,
        id: session.user.id,
      },
    },
    select: { isActive: true, mustChangePassword: true },
  })

  // If disabled/deleted or does not require password change, delegate to /api/auth/sync
  if (!dbUser || !dbUser.isActive || !dbUser.mustChangePassword) {
    redirect('/api/auth/sync')
  }

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
          <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <KeyRound size={14} /> Password Change Required
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Set your new password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            You are logging in with a temporary password or your password was reset. Please set a secure password to activate your account.
          </p>
        </div>

        <ChangePasswordForm />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Attainly security requirement &bull; Keep your credentials safe
        </p>
      </div>
    </main>
  )
}
