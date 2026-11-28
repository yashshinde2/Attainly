import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError, requirePermission } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { findOwnDocumentBySha256 } from '@/lib/server/services/document-intelligence'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    requirePermission(principal, 'document:read_own')
    const body = (await request.json()) as { sha256?: string }
    const sha256 = typeof body?.sha256 === 'string' ? body.sha256 : ''
    const match = await findOwnDocumentBySha256({
      institutionId: principal.institutionId,
      ownerUserId: principal.userId,
      sha256,
    })

    return NextResponse.json({ match }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    return NextResponse.json({ error: 'Checksum check failed.' }, { status: 400 })
  }
}
