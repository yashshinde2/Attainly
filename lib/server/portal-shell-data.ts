import 'server-only'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/server/db'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthenticationRequiredError, PasswordChangeRequiredError } from '@/lib/server/action-guard'
import { filterNavGroupsByPermissions, type PortalType } from '@/lib/portal-navigation'

export async function getPortalShellContext(portal: PortalType) {
  let principal
  try {
    principal = await getCurrentPrincipal()
  } catch (err) {
    if (err instanceof PasswordChangeRequiredError) {
      redirect('/change-password')
    }
    if (err instanceof AuthenticationRequiredError) {
      redirect('/login')
    }
    throw err
  }

  const [user, institution, currentAy] = await Promise.all([
    prisma.user.findUnique({
      where: { institutionId_id: { institutionId: principal.institutionId, id: principal.userId } },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true, key: true } },
      },
    }),
    prisma.institution.findUnique({
      where: { id: principal.institutionId },
      select: { name: true },
    }),
    prisma.academicYear.findFirst({
      where: { institutionId: principal.institutionId, isCurrent: true },
      select: { label: true },
    }),
  ])

  const navGroups = filterNavGroupsByPermissions(portal, principal.permissions)

  return {
    portal,
    navGroups,
    institutionName: institution?.name ?? 'Attainly Institution',
    userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Member',
    userEmail: user?.email ?? '',
    roleLabel: user?.role.name ?? portal,
    academicYearLabel: currentAy?.label ?? null,
  }
}
