import 'server-only'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/server/db'
import { generateTemporaryPassword } from '../password'
import type { CreatedImportUser, UserImportRepository, UserImportResult } from '../services/user-import'

export class PrismaUserImportRepository implements UserImportRepository<UserImportResult> {
  async importUsers(input: Parameters<UserImportRepository<UserImportResult>['importUsers']>[0]): Promise<UserImportResult> {
    const users = input.users.map((user) => ({ ...user, email: user.email.toLowerCase() }))
    const roleKeys = [...new Set(users.map((user) => user.roleKey))]
    const roles = await prisma.role.findMany({
      where: { institutionId: input.institutionId, key: { in: roleKeys } },
      select: { id: true, key: true },
    })
    const roleIds = new Map(roles.map((role) => [role.key, role.id]))
    const missingRole = roleKeys.find((key) => !roleIds.has(key))
    if (missingRole) throw new Error(`Unknown role key: ${missingRole}`)

    // Check existing users in this institution to avoid duplicate collisions
    const existingUsers = await prisma.user.findMany({
      where: {
        institutionId: input.institutionId,
        email: { in: users.map((u) => u.email) },
      },
      select: { email: true },
    })
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()))

    const createdUsers: CreatedImportUser[] = []
    let skippedCount = 0

    for (const user of users) {
      if (existingEmails.has(user.email)) {
        skippedCount++
        continue
      }

      const temporaryPassword = generateTemporaryPassword(14)
      const passwordHash = await hash(temporaryPassword, 12)
      const roleId = roleIds.get(user.roleKey)!

      try {
        const created = await prisma.user.create({
          data: {
            institutionId: input.institutionId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId,
            passwordHash,
            mustChangePassword: true,
            isActive: true,
          },
        })

        if (user.roleKey === 'STUDENT') {
          await prisma.studentProfile.upsert({
            where: { institutionId_userId: { institutionId: input.institutionId, userId: created.id } },
            update: {},
            create: { institutionId: input.institutionId, userId: created.id },
          })
        } else if (user.roleKey === 'FACULTY') {
          await prisma.facultyProfile.upsert({
            where: { institutionId_userId: { institutionId: input.institutionId, userId: created.id } },
            update: {},
            create: { institutionId: input.institutionId, userId: created.id },
          })
        }

        existingEmails.add(user.email)
        createdUsers.push({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          roleKey: user.roleKey,
          temporaryPassword,
        })
      } catch (err: any) {
        // If unique constraint or race condition hit, count as skipped
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
          skippedCount++
        } else {
          throw err
        }
      }
    }

    return {
      count: createdUsers.length,
      createdUsers,
      skippedCount,
    }
  }
}
