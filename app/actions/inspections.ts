'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import {
  createInspectionCollection,
  deleteInspectionCollection,
} from '@/lib/server/services/inspection'
import {
  completeMyDataRequest,
  createDataCollectionRequests,
  sendDataRequestReminder,
} from '@/lib/server/services/data-requests'

export type InspectionActionState = { status: 'idle' | 'success' | 'error'; message: string }

const runAuthorized = createActionGuard(getCurrentPrincipal)

export async function createInspectionCollectionAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  try {
    await runAuthorized('report:view', (principal) =>
      createInspectionCollection(principal, {
        framework: String(formData.get('framework') ?? 'CUSTOM'),
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? '').trim() || null,
        academicYearIds: formData.getAll('academicYearIds').map(String).filter(Boolean),
        departmentIds: formData.getAll('departmentIds').map(String).filter(Boolean),
        reportIds: formData.getAll('reportIds').map(String).filter(Boolean),
        documentIds: formData.getAll('documentIds').map(String).filter(Boolean),
        includeUnverified: formData.get('includeUnverified') === 'on',
      }),
    )
    revalidatePath('/admin/inspections')
    return { status: 'success', message: 'Inspection collection created.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not create collection.' }
  }
}

export async function deleteInspectionCollectionAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  try {
    const collectionId = String(formData.get('collectionId') ?? '')
    await runAuthorized('report:view', (principal) =>
      deleteInspectionCollection(principal, collectionId),
    )
    revalidatePath('/admin/inspections')
    return { status: 'success', message: 'Collection deleted.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not delete collection.' }
  }
}

export async function createDataCollectionRequestsAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  try {
    const dueDateRaw = String(formData.get('dueDate') ?? '').trim()
    const deptRaw = String(formData.get('departmentId') ?? '').trim()
    const res = await runAuthorized('report:view', (principal) =>
      createDataCollectionRequests(principal, {
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? '').trim() || null,
        targetType: String(formData.get('targetType') ?? 'DOCUMENT'),
        targetUserIds: formData.getAll('targetUserIds').map(String).filter(Boolean),
        departmentId: deptRaw || null,
        dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      }),
    )
    revalidatePath('/admin/inspections')
    revalidatePath('/student/notifications')
    revalidatePath('/faculty/notifications')
    return { status: 'success', message: `Sent ${res.createdCount} data collection request(s).` }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not create requests.' }
  }
}

export async function sendDataRequestReminderAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  try {
    const requestId = String(formData.get('requestId') ?? '')
    await runAuthorized('report:view', (principal) =>
      sendDataRequestReminder(principal, requestId),
    )
    revalidatePath('/admin/inspections')
    revalidatePath('/student/notifications')
    revalidatePath('/faculty/notifications')
    return { status: 'success', message: 'Reminder recorded.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not send reminder.' }
  }
}

export async function completeDataRequestAction(
  _prev: InspectionActionState,
  formData: FormData,
): Promise<InspectionActionState> {
  try {
    const principal = await getCurrentPrincipal()
    await completeMyDataRequest(principal, {
      requestId: String(formData.get('requestId') ?? ''),
      responseNote: String(formData.get('responseNote') ?? '').trim() || null,
      linkedEntityType: String(formData.get('linkedEntityType') ?? '').trim() || null,
      linkedEntityId: String(formData.get('linkedEntityId') ?? '').trim() || null,
      linkedDocumentId: String(formData.get('linkedDocumentId') ?? '').trim() || null,
    })
    revalidatePath('/student/notifications')
    revalidatePath('/faculty/notifications')
    revalidatePath('/admin/inspections')
    return { status: 'success', message: 'Request marked as completed.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not complete request.' }
  }
}
