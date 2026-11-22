import 'server-only'
import { createAuthOptions } from '@/lib/server/auth-options'
import { PrismaCredentialAuthenticator } from '@/lib/server/repositories/credential-authenticator'

const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET

export const authOptions = createAuthOptions(new PrismaCredentialAuthenticator(), secret)
