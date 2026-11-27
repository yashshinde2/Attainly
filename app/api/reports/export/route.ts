import { NextResponse } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { requirePermission } from '@/lib/server/authorization'
import { runStudioReport } from '@/lib/server/services/report-studio'
import { buildNativeXlsxBuffer } from '@/lib/server/xlsx-export'
import type { ReportEntityType } from '@/lib/reporting-registry'
import type { ReportFilterValues } from '@/lib/report-types'

export async function POST(request: Request) {
  try {
    const principal = await getCurrentPrincipal()
    requirePermission(principal, 'report:view')

    const body = (await request.json()) as {
      entityType: ReportEntityType
      filters?: ReportFilterValues
    }

    const report = await runStudioReport(principal, body.entityType, {
      ...(body.filters ?? {}),
      page: 1,
      pageSize: 5000,
    })

    const buffer = await buildNativeXlsxBuffer(report)
    const filename = `attainly-${report.entityType.toLowerCase()}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'XLSX export failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
