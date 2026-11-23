import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { encode } from 'next-auth/jwt'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/server/db'

const portalByRole: Record<string, string> = {
  STUDENT: '/student',
  FACULTY: '/faculty',
  INSTITUTION_ADMIN: '/admin',
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.institutionId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const dbUser = await prisma.user.findUnique({
    where: {
      institutionId_id: {
        institutionId: session.user.institutionId,
        id: session.user.id,
      },
    },
    select: { mustChangePassword: true },
  })

  const targetPortal = portalByRole[session.user.roleKey] ?? '/'

  // If user does not need to change password, issue updated cookie with mustChangePassword = false
  if (!dbUser?.mustChangePassword) {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
    if (secret) {
      const isProduction = process.env.NODE_ENV === 'production'
      const cookieName = isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

      const updatedJwt = await encode({
        token: {
          sub: session.user.id,
          institutionId: session.user.institutionId,
          roleId: session.user.roleId,
          roleKey: session.user.roleKey,
          permissions: Array.isArray(session.user.permissions) ? [...session.user.permissions] : [],
          mustChangePassword: false,
        },
        secret,
      })

      const response = NextResponse.redirect(new URL(targetPortal, request.url))
      response.cookies.set(cookieName, updatedJwt, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
        maxAge: 60 * 60,
      })
      if (!isProduction) {
        response.cookies.set('next-auth.session-token', updatedJwt, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60,
        })
      }
      return response
    }
  }

  return NextResponse.redirect(new URL('/change-password', request.url))
}
