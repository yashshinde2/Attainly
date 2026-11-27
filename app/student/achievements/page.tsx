import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentAchievementsSection } from '@/components/student/achievements-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import {
  listInstitutionAchievementCategories,
  listOwnAchievementsPaginated,
} from '@/lib/server/services/student-achievements'

export default async function StudentAchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()
  const page = Math.max(1, Number(params.page) || 1)
  const categoryCode = params.category?.trim() || undefined

  const [paginated, categories] = await Promise.all([
    listOwnAchievementsPaginated({ principal, page, pageSize: 10, categoryCode }),
    listInstitutionAchievementCategories({ principal }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={
        <StudentAchievementsSection
          items={paginated.items}
          total={paginated.total}
          page={paginated.page}
          pageSize={paginated.pageSize}
          categories={categories}
          activeCategoryCode={categoryCode}
        />
      }
    />
  )
}
