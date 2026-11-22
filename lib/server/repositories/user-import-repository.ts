import 'server-only'
import { prisma } from '@/lib/server/db'
import type { UserImportRepository } from '../services/user-import'

export class PrismaUserImportRepository implements UserImportRepository<{ count: number }> {
  async importUsers(input: Parameters<UserImportRepository<{ count: number }>['importUsers']>[0]): Promise<{ count: number }> {
    const users = input.users.map((user) => ({ ...user, email: user.email.toLowerCase() }))
    const roleKeys = [...new Set(users.map((user) => user.roleKey))]
    const roles = await prisma.role.findMany({
      where: { institutionId: input.institutionId, key: { in: roleKeys } },
      select: { id: true, key: true },
    })
    const roleIds = new Map(roles.map((role) => [role.key, role.id]))
    const missingRole = roleKeys.find((key) => !roleIds.has(key))
    if (missingRole) throw new Error(`Unknown role key: ${missingRole}`)

    const result = await prisma.user.createMany({
      data: users.map(({ email, firstName, lastName, roleKey }) => ({
        institutionId: input.institutionId,
        email,
        firstName,
        lastName,
        roleId: roleIds.get(roleKey)!,
      })),
      skipDuplicates: true,
    })
    return { count: result.count }
  }
}
