import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { requirePermission } from '@/lib/server/authorization'
import { generateReportPackage } from '@/lib/server/services/report-packages'
import {
  buildReportPackagePdfBuffer,
  buildReportPackageXlsxBuffer,
  buildReportPackageZipBuffer,
} from '@/lib/server/services/report-package-renderers'
import { isReportPackageKey } from '@/lib/report-packages'

const requestSchema = z.object({
  action: z.enum(['preview', 'export_pdf', 'export_xlsx', 'export_zip']),
  packageKey: z.string().refine(isReportPackageKey, 'Invalid report package key.'),
  sectionIds: z.array(z.string()).optional(),
  academicYearId: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  targetUserId: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  includeUnverified: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    const principal = await getCurrentPrincipal()
    requirePermission(principal, 'report:view')

    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid report package request.' },
        { status: 400 },
      )
    }

    const body = parsed.data
    const pkg = await generateReportPackage(principal, {
      packageKey: body.packageKey,
      sectionIds: body.sectionIds,
      academicYearId: body.academicYearId ?? null,
      departmentId: body.departmentId ?? null,
      targetUserId: body.targetUserId ?? null,
      dateFrom: body.dateFrom ?? null,
      dateTo: body.dateTo ?? null,
      includeUnverified: body.includeUnverified ?? false,
      persistSnapshot: true,
    })

    if (body.action === 'preview') {
      return NextResponse.json({ package: pkg }, { status: 200 })
    }

    const baseFilename = `attainly-${pkg.packageKey.toLowerCase()}-${pkg.snapshotId.slice(-8)}`

    if (body.action === 'export_pdf') {
      const pdf = await buildReportPackagePdfBuffer(pkg)
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${baseFilename}.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    if (body.action === 'export_xlsx') {
      const xlsx = await buildReportPackageXlsxBuffer(pkg)
      return new NextResponse(new Uint8Array(xlsx), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${baseFilename}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const zip = await buildReportPackageZipBuffer(principal.institutionId, pkg)
    return new NextResponse(new Uint8Array(zip), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseFilename}-evidence.zip"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Report package generation failed.'
    const status =
      error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 400
    return NextResponse.json({ error: message }, { status })
  }
}
