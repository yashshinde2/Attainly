import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { getImportJobStatus } from '@/lib/server/services/import-center'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { jobId } = await context.params
    const job = await getImportJobStatus(principal, jobId)
    return NextResponse.json({ job }, { status: 200 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Failed to fetch import job.'
    return NextResponse.json({ error: message }, { status })
  }
}
