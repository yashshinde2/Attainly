import { NextResponse } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { getExportJobForDownload, openExportDownloadStream } from '@/lib/server/services/export-jobs'

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { jobId } = await context.params
    const job = await getExportJobForDownload(principal, jobId)
    const stream = await openExportDownloadStream(job.storageKey!)

    const filename = job.outputFilename ?? `attainly-export-${job.id.slice(-8)}.zip`
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        ...(job.outputSizeBytes ? { 'Content-Length': String(job.outputSizeBytes) } : {}),
        ...(job.outputSha256 ? { 'X-Content-SHA256': job.outputSha256 } : {}),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to download export.'
    const status = message.toLowerCase().includes('expired') ? 410 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
