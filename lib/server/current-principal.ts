import 'server-only'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { AuthenticationRequiredError } from './action-guard'
import type { AuthenticatedPrincipal } from './authorization'

export async function getCurrentPrincipal(): Promise<AuthenticatedPrincipal> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user?.id || !user.institutionId || !user.roleId) throw new AuthenticationRequiredError()

  return {
    userId: user.id,
    institutionId: user.institutionId,
    roleId: user.roleId,
    permissions: user.permissions,
  }
}
