import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentDocumentsSection } from '@/components/student/documents-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDocumentRepository } from '@/lib/server/repositories/document-repository'

const documentRepository = new PrismaDocumentRepository()

export default async function StudentDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()
  const page = Math.max(1, Number(params.page) || 1)
  const q = params.q?.trim() || ''

  const result = await documentRepository.listByOwnerPaginated({
    institutionId: principal.institutionId,
    ownerUserId: principal.userId,
    query: q || undefined,
    page,
    pageSize: 12,
  })

  return (
    <PortalDashboard
      portal="student"
      content={
        <StudentDocumentsSection
          items={result.items}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          initialQuery={q}
        />
      }
    />
  )
}
