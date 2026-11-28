import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { assertCanAccessImportCenter } from '@/lib/server/services/import-center'
import { isImportTypeKey } from '@/lib/import-types'
import { buildImportTemplateCsv, buildImportTemplateXlsx } from '@/lib/server/import-parsers'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ importType: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    assertCanAccessImportCenter(principal)

    const { importType } = await context.params
    if (!isImportTypeKey(importType)) {
      return NextResponse.json({ error: `Unknown import type: ${importType}` }, { status: 400 })
    }

    const format = request.nextUrl.searchParams.get('format')?.toLowerCase() === 'csv' ? 'csv' : 'xlsx'
    const slug = importType.toLowerCase().replace(/_/g, '-')

    if (format === 'csv') {
      const csv = buildImportTemplateCsv(importType)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="attainly-${slug}-template.csv"`,
        },
      })
    }

    const xlsxBuffer = await buildImportTemplateXlsx(importType)
    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attainly-${slug}-template.xlsx"`,
      },
    })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Failed to generate template.'
    return NextResponse.json({ error: message }, { status })
  }
}
