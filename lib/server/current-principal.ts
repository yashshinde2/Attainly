import 'server-only'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/server/db'
import { AuthenticationRequiredError, PasswordChangeRequiredError } from './action-guard'
import type { AuthenticatedPrincipal } from './authorization'

export interface DbUserAuthRecord {
  id: string
  institutionId: string
  roleId: string
  isActive: boolean
  mustChangePassword: boolean
  role: {
    key: string
    rolePermissions: Array<{ permission: { key: string } }>
  }
}

/**
 * Pure validation helper for resolving an active principal from a DB user record.
 * Exported for unit testing.
 */
export function resolveActivePrincipalFromRecord(
  dbUser: DbUserAuthRecord | null,
  options?: { allowMustChangePassword?: boolean },
): AuthenticatedPrincipal {
  if (!dbUser || !dbUser.isActive) {
    throw new AuthenticationRequiredError('Your account is disabled or no longer exists.')
  }
  if (dbUser.mustChangePassword && !options?.allowMustChangePassword) {
    throw new PasswordChangeRequiredError()
  }

  return {
    userId: dbUser.id,
    institutionId: dbUser.institutionId,
    roleId: dbUser.roleId,
    permissions: dbUser.role.rolePermissions.map(({ permission }) => permission.key),
  }
}

export async function getCurrentPrincipal(options?: {
  allowMustChangePassword?: boolean
}): Promise<AuthenticatedPrincipal> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  if (!user?.id || !user.institutionId) throw new AuthenticationRequiredError()

  const dbUser = await prisma.user.findUnique({
    where: {
      institutionId_id: {
        institutionId: user.institutionId,
        id: user.id,
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
            select: {
              permission: { select: { key: true } },
            },
          },
        },
      },
    },
  })

  return resolveActivePrincipalFromRecord(dbUser, options)
}
