import { NextResponse } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { cancelExportJob } from '@/lib/server/services/export-jobs'

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { jobId } = await context.params
    const job = await cancelExportJob(principal, jobId)
    return NextResponse.json({ job }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to cancel export job.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
