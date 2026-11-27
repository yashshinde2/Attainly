'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { assignVerificationReviewer, setVerificationStatus } from '@/lib/server/services/verification'

export type VerificationActionState = { status: 'idle' | 'success' | 'error'; message: string }

const runAuthorized = createActionGuard(getCurrentPrincipal)

export async function setVerificationStatusAction(
  _previous: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  try {
    const itemType = formData.get('itemType') as string
    const itemId = formData.get('itemId') as string
    const status = formData.get('status') as string
    const rejectionReasonRaw = formData.get('rejectionReason')
    const rejectionReason = typeof rejectionReasonRaw === 'string' ? rejectionReasonRaw : null
    const expectedVersionRaw = formData.get('expectedVersion')
    const expectedVersion = expectedVersionRaw ? Number(expectedVersionRaw) : undefined

    await runAuthorized('record:verify', (principal) => setVerificationStatus({
      principal,
      data: { itemType, itemId, status, rejectionReason, expectedVersion },
    }))

    revalidatePath('/admin')
    revalidatePath('/admin/verifications')
    revalidatePath('/faculty')
    revalidatePath('/student')
    return { status: 'success', message: `Claim marked as ${status.toLowerCase()}.` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update verification status.'
    return { status: 'error', message }
  }
}

export async function assignVerificationReviewerAction(
  _previous: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  try {
    const itemType = formData.get('itemType') as string
    const itemId = formData.get('itemId') as string
    const assignedToUserId = formData.get('assignedToUserId') as string
    if (!itemType || !itemId || !assignedToUserId) throw new Error('Missing assignment fields.')

    await runAuthorized('record:verify', (principal) =>
      assignVerificationReviewer({ principal, itemType, itemId, assignedToUserId }),
    )
    revalidatePath('/admin/verifications')
    return { status: 'success', message: 'Reviewer assigned.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not assign reviewer.'
    return { status: 'error', message }
  }
}
