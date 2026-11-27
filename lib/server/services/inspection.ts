import 'server-only'
import { z } from 'zod'
import { get } from '@vercel/blob'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { buildCsvContent } from '@/lib/report-types'
import type { ReportEntityType } from '@/lib/reporting-registry'
import { runStudioReport } from './report-studio'
import { buildNativeXlsxBuffer } from '../xlsx-export'
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
  const allowedDepts = await resolveDepartmentScope(principal)
  for (const deptId of data.departmentIds) {
    assertDepartmentAccess(allowedDepts, deptId)
  }
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

async function readStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

function sanitizeSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'item'
}

export async function generateInspectionZipPackage(
  principal: AuthenticatedPrincipal,
  collectionId: string,
): Promise<{ filename: string; buffer: Buffer }> {
  requirePermission(principal, 'report:view')
  const { institutionId } = principal
  const allowedDepts = await resolveDepartmentScope(principal)

  const collection = await prisma.inspectionCollection.findUnique({
    where: { institutionId_id: { institutionId, id: collectionId } },
  })
  if (!collection) throw new Error('Inspection collection not found.')

  for (const deptId of collection.departmentIds) {
    assertDepartmentAccess(allowedDepts, deptId)
  }

  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true, slug: true },
  })

  const entries: ZipEntryInput[] = []
  const reportSummaries: Array<{ reportType: string; rows: number; countingUnit: string }> = []

  const reportTypes = (collection.reportIds.length
    ? collection.reportIds
    : ['ACHIEVEMENTS', 'EVENTS', 'RESEARCH_PUBLICATIONS']) as ReportEntityType[]
  const deptId = collection.departmentIds.length === 1 ? collection.departmentIds[0] : undefined
  const ayId = collection.academicYearIds.length === 1 ? collection.academicYearIds[0] : undefined

  for (const rt of reportTypes) {
    try {
      const result = await runStudioReport(principal, rt, {
        departmentId: deptId,
        academicYearId: ayId,
        includeUnverified: collection.includeUnverified,
        page: 1,
        pageSize: 5000,
      })
      const csv = buildCsvContent(result)
      const xlsx = await buildNativeXlsxBuffer(result)
      entries.push({ name: `reports/${rt.toLowerCase()}.csv`, data: Buffer.from(csv, 'utf8') })
      entries.push({ name: `reports/${rt.toLowerCase()}.xlsx`, data: xlsx })
      reportSummaries.push({
        reportType: rt,
        rows: result.totalRows ?? result.rows.length,
        countingUnit: result.countingUnit ?? result.subtitle,
      })
    } catch {
      // Skip unsupported report ids
    }
  }

  const docs = await prisma.document.findMany({
    where: {
      institutionId,
      ...(collection.documentIds.length ? { id: { in: collection.documentIds } } : {}),
      ...(allowedDepts
        ? {
            owner: {
              OR: [
                { student: { departmentId: { in: allowedDepts } } },
                { faculty: { departmentId: { in: allowedDepts } } },
              ],
            },
          }
        : collection.departmentIds.length > 0
          ? {
              owner: {
                OR: [
                  { student: { departmentId: { in: collection.departmentIds } } },
                  { faculty: { departmentId: { in: collection.departmentIds } } },
                ],
              },
            }
          : {}),
    },
    include: {
      owner: {
        select: {
          firstName: true,
          lastName: true,
          student: { select: { department: { select: { code: true } } } },
          faculty: { select: { department: { select: { code: true } } } },
        },
      },
    },
    take: collection.documentIds.length ? undefined : 100,
    orderBy: { createdAt: 'desc' },
  })

  const evidenceManifestEntries: Array<{
    id: string
    originalFilename: string
    archivePath: string | null
    owner: string
    department: string
    entityType: string
    mimeType: string
    sizeBytes: number
    sha256: string | null
    includedBinary: boolean
    note?: string
  }> = []

  for (const d of docs) {
    const deptCode = sanitizeSegment(d.owner.student?.department?.code ?? d.owner.faculty?.department?.code ?? 'INSTITUTION')
    const entityFolder = sanitizeSegment(d.entityType ?? 'GENERAL')
    const ownerSlug = sanitizeSegment(`${d.owner.firstName}_${d.owner.lastName}`)
    const fileSlug = sanitizeSegment(d.originalFilename)
    const archivePath = `evidence/${deptCode}/${entityFolder}/${ownerSlug}_${d.id.slice(-6)}_${fileSlug}`

    let includedBinary = false
    let note: string | undefined

    try {
      const blobRes = await get(d.pathname, { access: 'private' })
      if (blobRes && blobRes.statusCode === 200 && blobRes.stream) {
        const fileBuf = await readStreamToBuffer(blobRes.stream)
        entries.push({ name: archivePath, data: fileBuf })
        includedBinary = true
      } else {
        note = 'Private blob not found in storage'
      }
    } catch (err) {
      note = err instanceof Error ? err.message : 'Storage retrieval unavailable'
    }

    evidenceManifestEntries.push({
      id: d.id,
      originalFilename: d.originalFilename,
      archivePath: includedBinary ? archivePath : null,
      owner: `${d.owner.firstName} ${d.owner.lastName}`,
      department: deptCode,
      entityType: entityFolder,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      sha256: d.sha256,
      includedBinary,
      ...(note ? { note } : {}),
    })
  }

  const generatedAt = new Date().toISOString()
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
    generatedAt,
    reports: reportSummaries,
    evidenceDocuments: evidenceManifestEntries,
  }

  const humanIndex = [
    `# ${institution?.name ?? 'Attainly Institution'} — Inspection Evidence Package`,
    ``,
    `- **Collection:** ${collection.title}`,
    `- **Framework:** ${collection.framework}`,
    `- **Verification Scope:** ${manifest.verificationScope}`,
    `- **Generated At:** ${generatedAt}`,
    `- **Disclaimer:** ${manifest.disclaimer}`,
    ``,
    `## Reports Included (${reportSummaries.length})`,
    ...reportSummaries.map((r) => `- \`reports/${r.reportType.toLowerCase()}.xlsx\` & \`.csv\` — ${r.rows} rows (${r.countingUnit})`),
    ``,
    `## Supporting Evidence Files (${evidenceManifestEntries.length})`,
    ...evidenceManifestEntries.map(
      (e) =>
        `- ${e.includedBinary ? `\`${e.archivePath}\`` : `[NOT RETRIEVED: ${e.note}]`} — ${e.originalFilename} (${e.owner}, ${e.department})`,
    ),
  ].join('\n')

  entries.push({ name: 'INDEX.md', data: Buffer.from(humanIndex, 'utf8') })
  entries.push({ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') })
  entries.push({
    name: 'evidence/evidence-index.csv',
    data: Buffer.from(
      [
        'ID,Filename,Owner,Department,EntityType,MimeType,SizeBytes,SHA256,IncludedBinary,ArchivePath,Note',
        ...evidenceManifestEntries.map((d) =>
          [
            d.id,
            d.originalFilename,
            d.owner,
            d.department,
            d.entityType,
            d.mimeType,
            d.sizeBytes,
            d.sha256 ?? '',
            d.includedBinary,
            d.archivePath ?? '',
            d.note ?? '',
          ]
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
