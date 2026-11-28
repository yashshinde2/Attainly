import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import {
  applyReviewerAssignmentRules,
  bulkDecideVerifications,
  type BulkVerificationItemInput,
} from '@/lib/server/services/verification'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as {
      action?: 'decide' | 'auto_assign'
      items?: BulkVerificationItemInput[]
      decision?: 'VERIFIED' | 'REJECTED'
      rejectionReason?: string | null
    }

    if (body.action === 'auto_assign') {
      const result = await applyReviewerAssignmentRules(principal)
      return NextResponse.json(result, { status: 200 })
    }

    const result = await bulkDecideVerifications({
      principal,
      items: Array.isArray(body.items) ? body.items : [],
      decision: body.decision === 'REJECTED' ? 'REJECTED' : 'VERIFIED',
      rejectionReason: body.rejectionReason ?? null,
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Bulk verification action failed.'
    return NextResponse.json({ error: message }, { status })
  }
}
