import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

const portalByRole: Record<string, string> = {
  STUDENT: '/student',
  FACULTY: '/faculty',
  INSTITUTION_ADMIN: '/admin',
}

const roleByPortal: Record<string, string> = {
  '/student': 'STUDENT',
  '/faculty': 'FACULTY',
  '/admin': 'INSTITUTION_ADMIN',
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isChangePasswordRoute = pathname === '/change-password' || pathname.startsWith('/change-password/')
  const portal = Object.keys(roleByPortal).find((path) => pathname === path || pathname.startsWith(`${path}/`))

  if (!portal && !isChangePasswordRoute) return NextResponse.next()

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'auth-config')
    return NextResponse.redirect(loginUrl)
  }

  const token = await getToken({ req: request, secret })
  if (!token?.sub || typeof token.roleKey !== 'string') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  // Forced password change gate
  if (token.mustChangePassword === true) {
    if (!isChangePasswordRoute) {
      return NextResponse.redirect(new URL('/change-password', request.url))
    }
    return NextResponse.next()
  }

  // If user has already changed password and visits /change-password, redirect to their portal
  if (isChangePasswordRoute) {
    return NextResponse.redirect(new URL(portalByRole[token.roleKey] ?? '/', request.url))
  }

  // Role portal matching
  if (portal && token.roleKey !== roleByPortal[portal]) {
    return NextResponse.redirect(new URL(portalByRole[token.roleKey] ?? '/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/faculty/:path*', '/admin/:path*', '/change-password/:path*'],
}
