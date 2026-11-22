'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { hash } from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/server/db'

export type ChangePasswordState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const passwordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters long.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
})

const portalByRole: Record<string, string> = {
  STUDENT: '/student',
  FACULTY: '/faculty',
  INSTITUTION_ADMIN: '/admin',
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  let targetPortal = '/'

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.institutionId) {
      return { status: 'error', message: 'You must be signed in to change your password.' }
    }

    const { id: userId, institutionId, roleId, roleKey } = session.user
    const permissions = Array.isArray(session.user.permissions) ? [...session.user.permissions] : []

    const newPassword = formData.get('newPassword')
    const confirmPassword = formData.get('confirmPassword')

    const parsed = passwordSchema.safeParse({ newPassword, confirmPassword })
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? 'Invalid password.'
      return { status: 'error', message: errorMsg }
    }

    const passwordHash = await hash(parsed.data.newPassword, 12)

    await prisma.user.update({
      where: {
        institutionId_id: {
          institutionId,
          id: userId,
        },
      },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    })

    // Re-issue JWT cookie with mustChangePassword = false so middleware immediately permits portal access
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
    if (secret) {
      const isProduction = process.env.NODE_ENV === 'production'
      const cookieStore = await cookies()
      const cookieName = isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

      const updatedJwt = await encode({
        token: {
          sub: userId,
          institutionId,
          roleId,
          roleKey,
          permissions,
          mustChangePassword: false,
        },
        secret,
      })

      cookieStore.set(cookieName, updatedJwt, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        maxAge: 60 * 60,
      })
      if (!isProduction && cookieStore.has('next-auth.session-token')) {
        cookieStore.set('next-auth.session-token', updatedJwt, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60,
        })
      }
    }

    targetPortal = portalByRole[roleKey] ?? '/'
  } catch (error: any) {
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Could not change password.'
    return { status: 'error', message }
  }

  redirect(targetPortal)
}
