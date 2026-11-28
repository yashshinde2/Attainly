import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { getImportJobErrorReportCsv } from '@/lib/server/services/import-center'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { jobId } = await context.params
    const report = await getImportJobErrorReportCsv(principal, jobId)

    return new NextResponse(report.csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${report.filename}"`,
      },
    })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Failed to generate error report.'
    return NextResponse.json({ error: message }, { status })
  }
}
