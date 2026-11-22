export type PermissionKey = string

export interface AuthenticatedPrincipal {
  userId: string
  institutionId: string
  roleId: string
  permissions: readonly PermissionKey[]
}

export class AuthorizationError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export function requirePermission(principal: AuthenticatedPrincipal, permission: PermissionKey): void {
  if (!principal.permissions.includes(permission)) {
    throw new AuthorizationError(`Missing required permission: ${permission}`)
  }
}

export function requireInstitutionScope(principal: AuthenticatedPrincipal, institutionId: string): void {
  if (principal.institutionId !== institutionId) {
    throw new AuthorizationError('The requested resource is outside the active institution.')
  }
}
