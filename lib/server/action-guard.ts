import 'server-only'
import { requirePermission, type AuthenticatedPrincipal, type PermissionKey } from './authorization'

export class AuthenticationRequiredError extends Error {
  constructor(message = 'Authentication is required.') {
    super(message)
    this.name = 'AuthenticationRequiredError'
  }
}

export class PasswordChangeRequiredError extends AuthenticationRequiredError {
  constructor() {
    super('Password change is required before accessing this resource.')
    this.name = 'PasswordChangeRequiredError'
  }
}

export type PrincipalResolver = () => Promise<AuthenticatedPrincipal | null>

export function createActionGuard(resolvePrincipal: PrincipalResolver) {
  return async function runAuthorized<T>(
    permission: PermissionKey,
    action: (principal: AuthenticatedPrincipal) => Promise<T>,
  ): Promise<T> {
    const principal = await resolvePrincipal()
    if (!principal) throw new AuthenticationRequiredError()
    requirePermission(principal, permission)
    return action(principal)
  }
}
