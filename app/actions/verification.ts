'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { setVerificationStatus } from '@/lib/server/services/verification'

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

    await runAuthorized('record:verify', (principal) => setVerificationStatus({
      principal,
      data: { itemType, itemId, status, rejectionReason },
    }))

    revalidatePath('/admin')
    revalidatePath('/faculty')
    revalidatePath('/student')
    return { status: 'success', message: `Claim marked as ${status.toLowerCase()}.` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update verification status.'
    return { status: 'error', message }
  }
}
