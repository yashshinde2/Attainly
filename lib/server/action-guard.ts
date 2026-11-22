import 'server-only'
import { requirePermission, type AuthenticatedPrincipal, type PermissionKey } from './authorization'

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication is required.')
    this.name = 'AuthenticationRequiredError'
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
