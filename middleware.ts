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
  const portal = Object.keys(roleByPortal).find((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`))
  if (!portal) return NextResponse.next()

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!secret) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'auth-config')
    return NextResponse.redirect(loginUrl)
  }

  const token = await getToken({ req: request, secret })
  if (!token?.sub || typeof token.roleKey !== 'string') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (token.roleKey !== roleByPortal[portal]) {
    return NextResponse.redirect(new URL(portalByRole[token.roleKey] ?? '/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/faculty/:path*', '/admin/:path*'],
}
