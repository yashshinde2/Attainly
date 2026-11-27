'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import {
  deleteSavedReportDefinition,
  saveReportDefinition,
} from '@/lib/server/services/reports'
import {
  createReportSnapshot,
  runStudioReport,
} from '@/lib/server/services/report-studio'
import type { ReportEntityType, ReportFilterValues, ReportTableResult } from '@/lib/report-types'
import type { SavedReport } from '@/generated/prisma/client'

const runAuthorized = createActionGuard(getCurrentPrincipal)

export async function runReportAction(input: {
  entityType: ReportEntityType
  filters?: ReportFilterValues
}): Promise<{ status: 'success'; result: ReportTableResult } | { status: 'error'; message: string }> {
  try {
    const result = await runAuthorized('report:view', (principal) =>
      runStudioReport(principal, input.entityType, input.filters ?? {}),
    )
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

export async function createReportSnapshotAction(input: {
  name: string
  savedReportId?: string | null
  result: ReportTableResult
  filters: ReportFilterValues
}): Promise<{ status: 'success'; snapshotId: string } | { status: 'error'; message: string }> {
  try {
    const snapshot = await runAuthorized('report:view', (principal) =>
      createReportSnapshot(principal, input),
    )
    revalidatePath('/admin/reports')
    return { status: 'success', snapshotId: snapshot.id }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not save snapshot.' }
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
