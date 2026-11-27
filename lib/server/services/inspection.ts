import 'server-only'
import { z } from 'zod'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { buildCsvContent, buildExcelXmlContent } from '@/lib/report-types'
import type { ReportEntityType } from '@/lib/reporting-registry'
import { runStudioReport } from './report-studio'
import { buildZipBuffer, type ZipEntryInput } from '../zip'

const inspectionSchema = z.object({
  framework: z.enum(['NAAC', 'NBA', 'AICTE', 'CUSTOM']).default('CUSTOM'),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  academicYearIds: z.array(z.string().min(1)).default([]),
  departmentIds: z.array(z.string().min(1)).default([]),
  reportIds: z.array(z.string().min(1)).default([]),
  documentIds: z.array(z.string().min(1)).default([]),
  includeUnverified: z.boolean().default(false),
})

export async function listInspectionCollections(principal: AuthenticatedPrincipal) {
  requirePermission(principal, 'report:view')
  return prisma.inspectionCollection.findMany({
    where: { institutionId: principal.institutionId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createInspectionCollection(principal: AuthenticatedPrincipal, raw: unknown) {
  requirePermission(principal, 'report:view')
  const data = inspectionSchema.parse(raw)
  return prisma.inspectionCollection.create({
    data: {
      institutionId: principal.institutionId,
      ...data,
      status: 'READY',
      createdByUserId: principal.userId,
    },
  })
}

export async function deleteInspectionCollection(principal: AuthenticatedPrincipal, collectionId: string) {
  requirePermission(principal, 'report:view')
  await prisma.inspectionCollection.delete({
    where: { institutionId_id: { institutionId: principal.institutionId, id: collectionId } },
  })
}

export async function generateInspectionZipPackage(
  principal: AuthenticatedPrincipal,
  collectionId: string,
): Promise<{ filename: string; buffer: Buffer }> {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal

  const collection = await prisma.inspectionCollection.findUnique({
    where: { institutionId_id: { institutionId, id: collectionId } },
  })
  if (!collection) throw new Error('Inspection collection not found.')

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true, slug: true },
  })

  const entries: ZipEntryInput[] = []
  const reportSummaries: Array<{ reportType: string; rows: number; countingUnit: string }> = []

  const reportTypes = (collection.reportIds.length ? collection.reportIds : ['ACHIEVEMENTS', 'EVENTS', 'RESEARCH_PUBLICATIONS']) as ReportEntityType[]
  const deptId = collection.departmentIds.length === 1 ? collection.departmentIds[0] : undefined
  const ayId = collection.academicYearIds.length === 1 ? collection.academicYearIds[0] : undefined

  for (const rt of reportTypes) {
    try {
      const result = await runStudioReport(principal, rt, {
        departmentId: deptId,
        academicYearId: ayId,
        includeUnverified: collection.includeUnverified,
        page: 1,
        pageSize: 500,
      })
      const csv = buildCsvContent(result)
      const xls = buildExcelXmlContent(result)
      entries.push({ name: `reports/${rt.toLowerCase()}.csv`, data: Buffer.from(csv, 'utf8') })
      entries.push({ name: `reports/${rt.toLowerCase()}.xls`, data: Buffer.from(xls, 'utf8') })
      reportSummaries.push({
        reportType: rt,
        rows: result.totalRows ?? result.rows.length,
        countingUnit: result.countingUnit ?? result.subtitle,
      })
    } catch {
      // Skip unsupported report ids
    }
  }

  const docs = collection.documentIds.length
    ? await prisma.document.findMany({
        where: { institutionId, id: { in: collection.documentIds } },
        select: { id: true, originalFilename: true, pathname: true, mimeType: true, sizeBytes: true, sha256: true, entityType: true },
      })
    : await prisma.document.findMany({
        where: { institutionId },
        take: 100,
        orderBy: { createdAt: 'desc' },
        select: { id: true, originalFilename: true, pathname: true, mimeType: true, sizeBytes: true, sha256: true, entityType: true },
      })

  const manifest = {
    institution: institution?.name ?? 'Attainly Institution',
    collectionId: collection.id,
    title: collection.title,
    framework: collection.framework,
    verificationScope: collection.includeUnverified
      ? 'Includes provisional/unverified records'
      : 'Verified records only',
    disclaimer:
      'Attainly generates structured evidence packages and verified institutional reports. It does not calculate official accreditation grades or certify compliance.',
    generatedAt: new Date().toISOString(),
    reports: reportSummaries,
    evidenceDocuments: docs,
  }

  entries.push({
    name: 'manifest.json',
    data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
  })

  entries.push({
    name: 'evidence/evidence-index.csv',
    data: Buffer.from(
      [
        'ID,Filename,EntityType,MimeType,SizeBytes,SHA256,Pathname',
        ...docs.map((d) =>
          [d.id, d.originalFilename, d.entityType ?? 'GENERAL', d.mimeType, d.sizeBytes, d.sha256 ?? '', d.pathname]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(','),
        ),
      ].join('\r\n'),
      'utf8',
    ),
  })

  await prisma.inspectionCollection.update({
    where: { institutionId_id: { institutionId, id: collectionId } },
    data: { lastExportedAt: new Date(), status: 'EXPORTED' },
  })

  const safeSlug = collection.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  return {
    filename: `${institution?.slug ?? 'attainly'}-${collection.framework.toLowerCase()}-${safeSlug}.zip`,
    buffer: buildZipBuffer(entries),
  }
}
