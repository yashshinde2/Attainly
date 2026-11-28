import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { rollbackImportJob } from '@/lib/server/services/import-center'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { jobId } = await context.params
    const result = await rollbackImportJob({ principal, jobId })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Failed to roll back import job.'
    return NextResponse.json({ error: message }, { status })
  }
}
