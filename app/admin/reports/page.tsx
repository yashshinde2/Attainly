import { PortalDashboard } from '@/components/portal-dashboard'
import { AdminReportsWorkspace } from '@/components/admin-reports-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { listInstitutionDepartments } from '@/lib/server/services/department'
import {
  achievementStatsByCategory,
  certificationResearchPatentStats,
  criterionCoverageReport,
  eventParticipationStats,
  listSavedReports,
  profileCompletenessLaggards,
  verificationQueueAging,
} from '@/lib/server/services/reports'
import type { ReportEntityType, ReportTableResult } from '@/lib/report-types'

const departmentRepository = new PrismaDepartmentRepository()

async function runInitialReport(
  entityType: string | undefined,
  principal: Awaited<ReturnType<typeof getCurrentPrincipal>>,
): Promise<ReportTableResult | null> {
  if (!entityType) return null
  const generatedAt = new Date().toISOString()

  switch (entityType as ReportEntityType) {
    case 'VERIFICATION_AGING': {
      const rows = await verificationQueueAging({ principal })
      return {
        entityType: 'VERIFICATION_AGING',
        title: 'Verification Queue Aging',
        subtitle: 'Pending verification items older than 7, 14, and 30 days',
        columns: [
          { key: 'label', label: 'Record Type' },
          { key: 'totalPending', label: 'Total Pending' },
          { key: 'olderThan7Days', label: '> 7 Days' },
          { key: 'olderThan14Days', label: '> 14 Days' },
          { key: 'olderThan30Days', label: '> 30 Days' },
        ],
        rows: rows.map((r) => ({ ...r })),
        generatedAt,
      }
    }
    case 'COMPLETENESS_LAGGARDS': {
      const rows = await profileCompletenessLaggards({ principal, threshold: 50 })
      return {
        entityType: 'COMPLETENESS_LAGGARDS',
        title: 'Profile Completeness Laggards (< 50%)',
        subtitle: 'Students and faculty below 50% profile completeness',
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'departmentName', label: 'Department' },
          { key: 'completenessPercentage', label: 'Completeness %' },
          { key: 'missingSummary', label: 'Missing Sections' },
        ],
        rows: rows.map((r) => ({
          name: r.name,
          email: r.email,
          role: r.role,
          departmentName: r.departmentName,
          completenessPercentage: `${r.completenessPercentage}%`,
          missingSummary: r.missingSections.join(', '),
        })),
        generatedAt,
      }
    }
    case 'CRITERION_COVERAGE': {
      const rows = await criterionCoverageReport({ principal })
      return {
        entityType: 'CRITERION_COVERAGE',
        title: 'Accreditation Criterion Coverage & Gaps',
        subtitle: 'Verified tagged items per criterion code',
        columns: [
          { key: 'code', label: 'Criterion Code' },
          { key: 'label', label: 'Description' },
          { key: 'verifiedCount', label: 'Verified Items' },
          { key: 'totalTaggedCount', label: 'Total Tagged' },
          { key: 'status', label: 'Coverage Status' },
        ],
        rows: rows.map((r) => ({
          code: r.code,
          label: r.label,
          verifiedCount: r.verifiedCount,
          totalTaggedCount: r.totalTaggedCount,
          status: r.isGap ? 'GAP (Zero Verified)' : 'Covered',
          isGap: r.isGap,
        })),
        generatedAt,
      }
    }
    case 'ACHIEVEMENTS': {
      const rows = await achievementStatsByCategory({ principal })
      return {
        entityType: 'ACHIEVEMENTS',
        title: 'Achievement Statistics by Category',
        subtitle: 'Verified records only',
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'verificationStatus', label: 'Verification Status' },
          { key: 'count', label: 'Count' },
        ],
        rows: rows.map((r) => ({ ...r })),
        generatedAt,
      }
    }
    case 'EVENTS': {
      const rows = await eventParticipationStats({ principal })
      return {
        entityType: 'EVENTS',
        title: 'Event Participation Statistics',
        subtitle: 'Grouped by event type and participant role',
        columns: [
          { key: 'eventType', label: 'Event Type' },
          { key: 'role', label: 'Role' },
          { key: 'count', label: 'Participants' },
        ],
        rows: rows.map((r) => ({ ...r })),
        generatedAt,
      }
    }
    case 'CERT_RESEARCH_PATENT': {
      const rows = await certificationResearchPatentStats({ principal })
      return {
        entityType: 'CERT_RESEARCH_PATENT',
        title: 'Certifications, Research Papers & Patents',
        subtitle: 'Verified records only',
        columns: [
          { key: 'recordType', label: 'Record Type' },
          { key: 'departmentName', label: 'Department' },
          { key: 'batchYear', label: 'Batch Year' },
          { key: 'verificationStatus', label: 'Verification Status' },
          { key: 'count', label: 'Count' },
        ],
        rows: rows.map((r) => ({ ...r })),
        generatedAt,
      }
    }
    default:
      return null
  }
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const params = await searchParams
  const principal = await getCurrentPrincipal()

  const [departments, savedReports, initialResult] = await Promise.all([
    listInstitutionDepartments({ principal, repository: departmentRepository }),
    listSavedReports({ principal }),
    runInitialReport(params.type, principal),
  ])

  return (
    <PortalDashboard
      portal="admin"
      content={
        <AdminReportsWorkspace
          departments={departments}
          initialSavedReports={savedReports}
          initialResult={initialResult}
        />
      }
    />
  )
}
