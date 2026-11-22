import 'server-only'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/server/db'
import type { AuthenticatedAccount, CredentialAuthenticator } from '../auth-options'

export class PrismaCredentialAuthenticator implements CredentialAuthenticator {
  async authenticate(email: string, password: string): Promise<AuthenticatedAccount | null> {
    const matches = await prisma.user.findMany({
      where: { email: email.trim().toLowerCase(), isActive: true },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
      take: 2,
    })

    if (matches.length !== 1) return null
    const user = matches[0]
    if (!user.passwordHash || !(await compare(password, user.passwordHash))) return null

    return {
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      institutionId: user.institutionId,
      roleId: user.roleId,
      roleKey: user.role.key,
      permissions: user.role.rolePermissions.map(({ permission }) => permission.key),
    }
  }
}
