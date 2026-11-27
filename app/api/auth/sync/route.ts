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

function clearSessionCookies(response: NextResponse) {
  response.cookies.set('next-auth.session-token', '', { path: '/', maxAge: 0 })
  response.cookies.set('__Secure-next-auth.session-token', '', { path: '/', maxAge: 0 })
  return response
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.institutionId) {
    return clearSessionCookies(NextResponse.redirect(new URL('/login', request.url)))
  }

  const dbUser = await prisma.user.findUnique({
    where: {
      institutionId_id: {
        institutionId: session.user.institutionId,
        id: session.user.id,
      },
    },
    select: {
      id: true,
      institutionId: true,
      roleId: true,
      isActive: true,
      mustChangePassword: true,
      role: {
        select: {
          key: true,
          rolePermissions: {
            select: { permission: { select: { key: true } } },
          },
        },
      },
    },
  })

  if (!dbUser || !dbUser.isActive) {
    return clearSessionCookies(NextResponse.redirect(new URL('/login', request.url)))
  }

  const freshPermissions = dbUser.role.rolePermissions.map(({ permission }) => permission.key)
  const targetUrl = dbUser.mustChangePassword
    ? '/change-password'
    : (portalByRole[dbUser.role.key] ?? '/')

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  const response = NextResponse.redirect(new URL(targetUrl, request.url))

  if (secret) {
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

    const updatedJwt = await encode({
      token: {
        sub: dbUser.id,
        institutionId: dbUser.institutionId,
        roleId: dbUser.roleId,
        roleKey: dbUser.role.key,
        permissions: freshPermissions,
        mustChangePassword: dbUser.mustChangePassword,
      },
      secret,
    })

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
  }

  return response
}
