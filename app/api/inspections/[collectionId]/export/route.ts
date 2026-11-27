import { NextResponse } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { generateInspectionZipPackage } from '@/lib/server/services/inspection'
import { enqueueInspectionExportJob, preflightInspectionExport } from '@/lib/server/services/export-jobs'

export async function GET(
  request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { collectionId } = await context.params
    const forceAsync = new URL(request.url).searchParams.get('async') === '1'
    const preflight = await preflightInspectionExport(principal, collectionId)

    if (forceAsync || preflight.requiresBackground) {
      const job = await enqueueInspectionExportJob(principal, collectionId)
      return NextResponse.json(
        {
          queued: true,
          reason: preflight.reason ?? 'Background export requested.',
          job,
        },
        { status: 202, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const { filename, buffer } = await generateInspectionZipPackage(principal, collectionId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate inspection package.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
