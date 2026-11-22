import 'server-only'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { z } from 'zod'

export interface AuthenticatedAccount {
  userId: string
  email: string
  name: string
  institutionId: string
  roleId: string
  roleKey: string
  permissions: string[]
  mustChangePassword: boolean
}

export interface CredentialAuthenticator {
  authenticate(email: string, password: string): Promise<AuthenticatedAccount | null>
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
})

export function createAuthOptions(authenticator: CredentialAuthenticator, secret?: string): NextAuthOptions {
  return {
    ...(secret ? { secret } : {}),
    session: { strategy: 'jwt', maxAge: 60 * 60 },
    providers: [
      CredentialsProvider({
        name: 'Email and password',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(input) {
          const parsed = credentialsSchema.safeParse(input)
          if (!parsed.success) return null
          const account = await authenticator.authenticate(parsed.data.email, parsed.data.password)
          if (!account) return null
          return {
            id: account.userId,
            email: account.email,
            name: account.name,
            institutionId: account.institutionId,
            roleId: account.roleId,
            roleKey: account.roleKey,
            permissions: account.permissions,
            mustChangePassword: account.mustChangePassword,
          }
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          const account = user as typeof user & Partial<AuthenticatedAccount>
          token.sub = account.userId ?? account.id
          token.institutionId = account.institutionId
          token.roleId = account.roleId
          token.roleKey = account.roleKey
          token.permissions = account.permissions ?? []
          token.mustChangePassword = Boolean(account.mustChangePassword)
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub ?? ''
          session.user.institutionId = typeof token.institutionId === 'string' ? token.institutionId : ''
          session.user.roleId = typeof token.roleId === 'string' ? token.roleId : ''
          session.user.roleKey = typeof token.roleKey === 'string' ? token.roleKey : ''
          session.user.permissions = Array.isArray(token.permissions) ? token.permissions.filter((value): value is string => typeof value === 'string') : []
          session.user.mustChangePassword = Boolean(token.mustChangePassword)
        }
        return session
      },
    },
  }
}
