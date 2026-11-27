import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { enqueueInspectionExportJob, listExportJobs } from '@/lib/server/services/export-jobs'

export async function GET() {
  try {
    const principal = await getCurrentPrincipal()
    const jobs = await listExportJobs(principal)
    return NextResponse.json({ jobs }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to list export jobs.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as { collectionId?: string }
    if (!body?.collectionId) {
      return NextResponse.json({ error: 'collectionId is required.' }, { status: 400 })
    }

    const job = await enqueueInspectionExportJob(principal, body.collectionId)
    return NextResponse.json({ job }, { status: 202, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to enqueue export job.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
