import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminVerificationCenterClient } from '@/components/admin/verification-center'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { prisma } from '@/lib/server/db'
import { listVerificationCenterQueue, listVerificationHistory } from '@/lib/server/services/verification'

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()

  const [items, history, reviewerUsers] = await Promise.all([
    listVerificationCenterQueue({
      principal,
      itemType: params.itemType || undefined,
      overdueOnly: params.overdueOnly === '1',
      assignedToMe: params.assignedToMe === '1',
    }),
    listVerificationHistory({ principal, limit: 20 }),
    prisma.user.findMany({
      where: {
        institutionId: principal.institutionId,
        isActive: true,
        role: { key: { in: ['INSTITUTION_ADMIN', 'DEPARTMENT_COORDINATOR', 'FACULTY'] } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  const reviewers = reviewerUsers.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
  }))

  const cleanFilters: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v) cleanFilters[k] = v
  }

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminVerificationCenterClient
          items={items}
          reviewers={reviewers}
          history={history}
          filters={cleanFilters}
        />
      }
    />
  )
}
