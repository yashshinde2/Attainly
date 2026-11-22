import 'server-only'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/server/db'
import type { User, Role } from '@/generated/prisma/client'
import { generateTemporaryPassword } from '../password'
import type { CreateInstitutionUserInput, InstitutionUserRepository } from '../services/institution-user'

export type UserWithRole = User & { role: Role }

export class PrismaInstitutionUserRepository implements InstitutionUserRepository<UserWithRole, Role> {
  async listUsers(input: { institutionId: string }): Promise<UserWithRole[]> {
    return prisma.user.findMany({
      where: { institutionId: input.institutionId },
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async listRoles(input: { institutionId: string }): Promise<Role[]> {
    return prisma.role.findMany({
      where: { institutionId: input.institutionId },
      orderBy: { name: 'asc' },
    })
  }

  async createUser(input: {
    institutionId: string
    data: CreateInstitutionUserInput
  }): Promise<{ user: UserWithRole; temporaryPassword: string }> {
    const email = input.data.email.toLowerCase()
    const role = await prisma.role.findUnique({
      where: {
        institutionId_key: {
          institutionId: input.institutionId,
          key: input.data.roleKey,
        },
      },
    })

    if (!role) {
      throw new Error(`Unknown role key: ${input.data.roleKey}`)
    }

    const temporaryPassword = generateTemporaryPassword(14)
    const passwordHash = await hash(temporaryPassword, 12)

    try {
      const user = await prisma.user.create({
        data: {
          institutionId: input.institutionId,
          email,
          firstName: input.data.firstName,
          lastName: input.data.lastName,
          roleId: role.id,
          passwordHash,
          mustChangePassword: true,
          isActive: true,
        },
        include: {
          role: true,
        },
      })

      if (input.data.roleKey === 'STUDENT') {
        await prisma.studentProfile.upsert({
          where: { institutionId_userId: { institutionId: input.institutionId, userId: user.id } },
          update: {},
          create: { institutionId: input.institutionId, userId: user.id },
        })
      } else if (input.data.roleKey === 'FACULTY') {
        await prisma.facultyProfile.upsert({
          where: { institutionId_userId: { institutionId: input.institutionId, userId: user.id } },
          update: {},
          create: { institutionId: input.institutionId, userId: user.id },
        })
      }

      return { user, temporaryPassword }
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error('A user with this email already exists.')
      }
      throw error
    }
  }

  async resetPassword(input: {
    institutionId: string
    userId: string
  }): Promise<{ user: UserWithRole; temporaryPassword: string }> {
    const user = await prisma.user.findFirst({
      where: { id: input.userId, institutionId: input.institutionId },
      include: { role: true },
    })

    if (!user) {
      throw new Error('User not found.')
    }

    const temporaryPassword = generateTemporaryPassword(14)
    const passwordHash = await hash(temporaryPassword, 12)

    const updated = await prisma.user.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.userId } },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
      include: {
        role: true,
      },
    })

    return { user: updated, temporaryPassword }
  }
}
