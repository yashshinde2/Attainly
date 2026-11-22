import 'server-only'
import type { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { userRowSchema } from './user-import'

export type CreateInstitutionUserInput = z.infer<typeof userRowSchema>

export interface InstitutionUserRepository<TUser, TRole> {
  listUsers(input: { institutionId: string }): Promise<TUser[]>
  listRoles(input: { institutionId: string }): Promise<TRole[]>
  createUser(input: { institutionId: string; data: CreateInstitutionUserInput }): Promise<TUser>
}

function resolveUserManagePermission(principal: AuthenticatedPrincipal): string {
  if (principal.permissions.includes('user:manage')) return 'user:manage'
  if (principal.permissions.includes('department:manage')) return 'department:manage'
  return 'user:import'
}

export async function listInstitutionUsers<TUser, TRole>(input: {
  principal: AuthenticatedPrincipal
  repository: InstitutionUserRepository<TUser, TRole>
}): Promise<TUser[]> {
  requirePermission(input.principal, resolveUserManagePermission(input.principal))
  return input.repository.listUsers({ institutionId: input.principal.institutionId })
}

export async function listInstitutionRoles<TUser, TRole>(input: {
  principal: AuthenticatedPrincipal
  repository: InstitutionUserRepository<TUser, TRole>
}): Promise<TRole[]> {
  requirePermission(input.principal, resolveUserManagePermission(input.principal))
  return input.repository.listRoles({ institutionId: input.principal.institutionId })
}

export async function createInstitutionUser<TUser, TRole>(input: {
  principal: AuthenticatedPrincipal
  repository: InstitutionUserRepository<TUser, TRole>
  data: unknown
}): Promise<TUser> {
  requirePermission(input.principal, resolveUserManagePermission(input.principal))
  const data = userRowSchema.parse(input.data)
  return input.repository.createUser({ institutionId: input.principal.institutionId, data })
}
