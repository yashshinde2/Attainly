'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import {
  achievementStatsByCategory,
  certificationResearchPatentStats,
  criterionCoverageReport,
  deleteSavedReportDefinition,
  eventParticipationStats,
  profileCompletenessLaggards,
  saveReportDefinition,
  verificationQueueAging,
} from '@/lib/server/services/reports'
import type { ReportEntityType, ReportFilterValues, ReportTableResult } from '@/lib/report-types'
import type { SavedReport } from '@/generated/prisma/client'

const runAuthorized = createActionGuard(getCurrentPrincipal)

export async function runReportAction(input: {
  entityType: ReportEntityType
  filters?: ReportFilterValues
}): Promise<{ status: 'success'; result: ReportTableResult } | { status: 'error'; message: string }> {
  try {
    const f = input.filters ?? {}
    const dateRange = f.dateFrom || f.dateTo ? { from: f.dateFrom || null, to: f.dateTo || null } : undefined
    const includeUnverified = Boolean(f.includeUnverified)
    const generatedAt = new Date().toISOString()

    const result = await runAuthorized('report:view', async (principal): Promise<ReportTableResult> => {
      switch (input.entityType) {
        case 'ACHIEVEMENTS': {
          const rows = await achievementStatsByCategory({
            principal,
            departmentId: f.departmentId || null,
            batchYear: f.batchYear ?? null,
            dateRange,
            includeUnverified,
          })
          return {
            entityType: 'ACHIEVEMENTS',
            title: 'Achievement Statistics by Category',
            subtitle: includeUnverified
              ? 'Includes verified, pending, and rejected records'
              : 'Verified records only',
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
          const rows = await eventParticipationStats({
            principal,
            eventType: f.eventType || null,
            departmentId: f.departmentId || null,
            dateRange,
          })
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
          const rows = await certificationResearchPatentStats({
            principal,
            departmentId: f.departmentId || null,
            batchYear: f.batchYear ?? null,
            dateRange,
            includeUnverified,
          })
          return {
            entityType: 'CERT_RESEARCH_PATENT',
            title: 'Certifications, Research Papers & Patents',
            subtitle: includeUnverified
              ? 'Includes verified, pending, and rejected records'
              : 'Verified records only',
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
          const threshold = typeof f.threshold === 'number' ? f.threshold : 60
          const rows = await profileCompletenessLaggards({
            principal,
            threshold,
            departmentId: f.departmentId || null,
          })
          return {
            entityType: 'COMPLETENESS_LAGGARDS',
            title: `Profile Completeness Laggards (< ${threshold}%)`,
            subtitle: 'Students and faculty below the completeness threshold',
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
          const rows = await criterionCoverageReport({
            principal,
            includeUnverified,
          })
          return {
            entityType: 'CRITERION_COVERAGE',
            title: 'Accreditation Criterion Coverage & Gaps',
            subtitle: includeUnverified
              ? 'Tagged items (including unverified)'
              : 'Verified tagged items per criterion code',
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
      }
    })

    return { status: 'success', result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run report.'
    return { status: 'error', message }
  }
}

export async function saveReportAction(input: {
  name: string
  entityType: ReportEntityType
  filters: ReportFilterValues
}): Promise<{ status: 'success'; savedReport: SavedReport } | { status: 'error'; message: string }> {
  try {
    const savedReport = await runAuthorized('report:view', (principal) =>
      saveReportDefinition({
        principal,
        data: {
          name: input.name,
          entityType: input.entityType,
          filters: input.filters,
        },
      }),
    )
    revalidatePath('/admin/reports')
    return { status: 'success', savedReport }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save report.'
    return { status: 'error', message }
  }
}

export async function deleteSavedReportAction(
  id: string,
): Promise<{ status: 'success' } | { status: 'error'; message: string }> {
  try {
    await runAuthorized('report:view', (principal) =>
      deleteSavedReportDefinition({ principal, id }),
    )
    revalidatePath('/admin/reports')
    return { status: 'success' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete saved report.'
    return { status: 'error', message }
  }
}
