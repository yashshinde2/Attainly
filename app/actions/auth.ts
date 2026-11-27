'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { hash } from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/server/db'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { resolveSessionCookieTarget } from '@/lib/server/session-cookie'

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
  DEPARTMENT_COORDINATOR: '/admin/verifications',
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  let targetPortal = '/'

  try {
    const principal = await getCurrentPrincipal({ allowMustChangePassword: true })
    const session = await getServerSession(authOptions)
    const roleKey = session?.user?.roleKey ?? ''

    const newPassword = formData.get('newPassword')
    const confirmPassword = formData.get('confirmPassword')

    const parsed = passwordSchema.safeParse({ newPassword, confirmPassword })
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message ?? 'Invalid password.'
      return { status: 'error', message: errorMsg }
    }

    const passwordHash = await hash(parsed.data.newPassword, 12)

    const updatedUser = await prisma.user.update({
      where: {
        institutionId_id: {
          institutionId: principal.institutionId,
          id: principal.userId,
        },
      },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      select: {
        id: true,
        institutionId: true,
        roleId: true,
        role: {
          select: {
            key: true,
            rolePermissions: { select: { permission: { select: { key: true } } } },
          },
        },
      },
    })

    const freshRoleKey = updatedUser.role.key || roleKey
    const freshPermissions = updatedUser.role.rolePermissions.map(({ permission }) => permission.key)

    // Re-issue JWT cookie with mustChangePassword = false and fresh role/permissions
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
    if (secret) {
      const cookieStore = await cookies()
      const target = resolveSessionCookieTarget({
        hasSecureCookie: cookieStore.has('__Secure-next-auth.session-token'),
        hasPlainCookie: cookieStore.has('next-auth.session-token'),
        nextAuthUrl: process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? null,
      })

      const updatedJwt = await encode({
        token: {
          sub: updatedUser.id,
          institutionId: updatedUser.institutionId,
          roleId: updatedUser.roleId,
          roleKey: freshRoleKey,
          permissions: freshPermissions,
          mustChangePassword: false,
        },
        secret,
      })

      cookieStore.set(target.cookieName, updatedJwt, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: target.secure,
        maxAge: 60 * 60,
      })
      if (cookieStore.has(target.staleCookieName)) {
        cookieStore.set(target.staleCookieName, '', { path: '/', maxAge: 0 })
      }
    }

    targetPortal = portalByRole[freshRoleKey] ?? '/'
  } catch (error: any) {
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Could not change password.'
    return { status: 'error', message }
  }

  redirect(targetPortal)
}
