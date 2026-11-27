export interface SessionCookieTarget {
  cookieName: '__Secure-next-auth.session-token' | 'next-auth.session-token'
  staleCookieName: '__Secure-next-auth.session-token' | 'next-auth.session-token'
  secure: boolean
}

/**
 * Resolves the exact NextAuth session cookie name and `secure` attribute
 * based on the incoming cookies and URL protocol (not NODE_ENV, since local
 * production servers often run over http://localhost).
 */
export function resolveSessionCookieTarget(input: {
  hasSecureCookie?: boolean
  hasPlainCookie?: boolean
  nextAuthUrl?: string | null
  requestUrl?: string | null
}): SessionCookieTarget {
  const isHttpsUrl =
    Boolean(input.nextAuthUrl?.startsWith('https://')) ||
    Boolean(input.requestUrl?.startsWith('https://'))

  const useSecure = input.hasSecureCookie
    ? true
    : input.hasPlainCookie
      ? false
      : isHttpsUrl

  return useSecure
    ? {
        cookieName: '__Secure-next-auth.session-token',
        staleCookieName: 'next-auth.session-token',
        secure: true,
      }
    : {
        cookieName: 'next-auth.session-token',
        staleCookieName: '__Secure-next-auth.session-token',
        secure: false,
      }
}
