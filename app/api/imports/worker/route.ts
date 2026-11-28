import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import {
  assertCanAccessImportCenter,
  claimNextQueuedImportJob,
  processImportJob,
} from '@/lib/server/services/import-center'

export const maxDuration = 300

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

async function handleWorker(request: NextRequest) {
  try {
    let targetJobId: string | undefined = request.nextUrl.searchParams.get('jobId') || undefined

    if (!isAuthorizedCron(request)) {
      const principal = await getCurrentPrincipal()
      assertCanAccessImportCenter(principal)
    }

    if (!targetJobId && request.method === 'POST') {
      try {
        const body = (await request.json()) as { jobId?: string }
        if (body?.jobId) targetJobId = body.jobId
      } catch {
        // Optional body
      }
    }

    const claimed = await claimNextQueuedImportJob(targetJobId)
    if (!claimed) {
      return NextResponse.json({ processed: false, reason: 'No queued import jobs found.' }, { status: 200 })
    }

    const result = await processImportJob({ institutionId: claimed.institutionId, id: claimed.id })
    return NextResponse.json(
      {
        processed: true,
        jobId: claimed.id,
        status: result.status,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        failedCount: result.failedCount,
        errorMessage: result.errorMessage,
      },
      { status: 200 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import worker error.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  return handleWorker(request)
}

export async function POST(request: NextRequest) {
  return handleWorker(request)
}
