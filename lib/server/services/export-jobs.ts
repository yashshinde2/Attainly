import 'server-only'
import { createReadStream } from 'node:fs'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { get, put } from '@vercel/blob'
import { prisma } from '@/lib/server/db'
import { requirePermission, type AuthenticatedPrincipal, type PermissionKey } from '../authorization'
import { assertDepartmentAccess, resolveDepartmentScope } from './admin-command'
import { buildCsvContent } from '@/lib/report-types'
import { REPORT_REGISTRY, type ReportEntityType } from '@/lib/reporting-registry'
import { runStudioReport } from './report-studio'
import { buildNativeXlsxBuffer } from '../xlsx-export'
import { allocateUniqueArchivePath, sanitizeArchiveSegment, StreamingZipWriter } from '../streaming-zip'

export const EXPORT_LIMITS = {
  SYNC_MAX_DOCUMENTS: 10,
  SYNC_MAX_BYTES: 10 * 1024 * 1024, // 10 MB
  SYNC_MAX_REPORTS: 4,
  MAX_DOCUMENTS_PER_PACKAGE: 2000,
  MAX_PACKAGE_BYTES: 512 * 1024 * 1024, // 512 MB
  FETCH_CONCURRENCY: 4,
  MAX_RETRIES: 2,
  EXPIRY_HOURS: 24,
} as const

export interface ExportPreFlightSummary {
  documentCount: number
  totalBytes: number
  reportCount: number
  requiresBackground: boolean
  reason?: string
}

async function resolveCollectionForExport(principal: AuthenticatedPrincipal, collectionId: string) {
  requirePermission(principal, 'report:view')
  const allowedDepts = await resolveDepartmentScope(principal)
  const collection = await prisma.inspectionCollection.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: collectionId } },
  })
  if (!collection) throw new Error('Inspection collection not found.')
  for (const deptId of collection.departmentIds) {
    assertDepartmentAccess(allowedDepts, deptId)
  }
  return { collection, allowedDepts }
}

function buildDocumentWhereForCollection(
  institutionId: string,
  collection: { documentIds: string[]; departmentIds: string[] },
  allowedDepts: string[] | null,
) {
  const effectiveDepts = allowedDepts ?? (collection.departmentIds.length > 0 ? collection.departmentIds : null)
  return {
    institutionId,
    ...(collection.documentIds.length ? { id: { in: collection.documentIds } } : {}),
    ...(effectiveDepts
      ? {
          owner: {
            OR: [
              { student: { departmentId: { in: effectiveDepts } } },
              { faculty: { departmentId: { in: effectiveDepts } } },
            ],
          },
        }
      : {}),
  }
}

export async function preflightInspectionExport(
  principal: AuthenticatedPrincipal,
  collectionId: string,
): Promise<ExportPreFlightSummary> {
  const { collection, allowedDepts } = await resolveCollectionForExport(principal, collectionId)
  const docWhere = buildDocumentWhereForCollection(principal.institutionId, collection, allowedDepts)
  const agg = await prisma.document.aggregate({
    where: docWhere,
    _count: { _all: true },
    _sum: { sizeBytes: true },
  })
  const documentCount = agg._count._all
  const totalBytes = agg._sum.sizeBytes ?? 0
  const reportCount = collection.reportIds.length || 3

  if (documentCount > EXPORT_LIMITS.MAX_DOCUMENTS_PER_PACKAGE) {
    throw new Error(
      `Collection exceeds maximum supported package size (${documentCount} documents > ${EXPORT_LIMITS.MAX_DOCUMENTS_PER_PACKAGE} limit).`,
    )
  }
  if (totalBytes > EXPORT_LIMITS.MAX_PACKAGE_BYTES) {
    throw new Error(`Collection exceeds maximum package byte limit (${Math.round(totalBytes / 1024 / 1024)} MB > 512 MB).`)
  }

  let reason: string | undefined
  if (documentCount > EXPORT_LIMITS.SYNC_MAX_DOCUMENTS) {
    reason = `Document count (${documentCount}) exceeds synchronous limit (${EXPORT_LIMITS.SYNC_MAX_DOCUMENTS}).`
  } else if (totalBytes > EXPORT_LIMITS.SYNC_MAX_BYTES) {
    reason = `Total evidence size (${Math.round(totalBytes / 1024 / 1024)} MB) exceeds synchronous limit (10 MB).`
  } else if (reportCount > EXPORT_LIMITS.SYNC_MAX_REPORTS) {
    reason = `Report count (${reportCount}) exceeds synchronous limit (${EXPORT_LIMITS.SYNC_MAX_REPORTS}).`
  }

  return {
    documentCount,
    totalBytes,
    reportCount,
    requiresBackground: Boolean(reason),
    reason,
  }
}

export async function enqueueInspectionExportJob(
  principal: AuthenticatedPrincipal,
  collectionId: string,
) {
  const { collection } = await resolveCollectionForExport(principal, collectionId)
  const preflight = await preflightInspectionExport(principal, collectionId)

  return prisma.exportJob.create({
    data: {
      institutionId: principal.institutionId,
      requestedByUserId: principal.userId,
      jobType: 'INSPECTION_PACKAGE',
      collectionId: collection.id,
      specificationJson: {
        framework: collection.framework,
        title: collection.title,
        reportIds: collection.reportIds,
        departmentIds: collection.departmentIds,
        academicYearIds: collection.academicYearIds,
        documentIds: collection.documentIds,
        includeUnverified: collection.includeUnverified,
      },
      status: 'QUEUED',
      totalItems: preflight.reportCount + preflight.documentCount,
    },
  })
}

export async function listExportJobs(principal: AuthenticatedPrincipal, limit = 25) {
  requirePermission(principal, 'report:view')
  const allowedDepts = await resolveDepartmentScope(principal)
  const jobs = await prisma.exportJob.findMany({
    where: {
      institutionId: principal.institutionId,
      ...(allowedDepts !== null ? { requestedByUserId: principal.userId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      collection: { select: { title: true, framework: true } },
    },
  })
  return jobs
}

export async function cancelExportJob(principal: AuthenticatedPrincipal, jobId: string) {
  requirePermission(principal, 'report:view')
  const job = await prisma.exportJob.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: jobId } },
  })
  if (!job) throw new Error('Export job not found.')
  if (job.collectionId) await resolveCollectionForExport(principal, job.collectionId)

  if (job.status !== 'QUEUED' && job.status !== 'PROCESSING') {
    throw new Error(`Cannot cancel export job in ${job.status} state.`)
  }

  return prisma.exportJob.update({
    where: { institutionId_id: { institutionId: principal.institutionId, id: jobId } },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })
}

export async function getExportJobForDownload(principal: AuthenticatedPrincipal, jobId: string) {
  requirePermission(principal, 'report:view')
  const job = await prisma.exportJob.findUnique({
    where: { institutionId_id: { institutionId: principal.institutionId, id: jobId } },
  })
  if (!job) throw new Error('Export job not found.')
  if (job.collectionId) {
    await resolveCollectionForExport(principal, job.collectionId)
  } else {
    const allowedDepts = await resolveDepartmentScope(principal)
    if (allowedDepts !== null && job.requestedByUserId !== principal.userId) {
      throw new Error('You do not have access to download this export.')
    }
  }
  if (job.status !== 'COMPLETED' || !job.storageKey) {
    throw new Error(`Export job is ${job.status.toLowerCase()} and not ready for download.`)
  }
  if (job.expiresAt && job.expiresAt.getTime() < Date.now()) {
    throw new Error('This export download link has expired. Please queue a new export.')
  }
  return job
}

export async function openExportDownloadStream(storageKey: string): Promise<ReadableStream<Uint8Array>> {
  if (storageKey.startsWith('local://')) {
    const filePath = storageKey.slice('local://'.length)
    await stat(filePath)
    const nodeStream = createReadStream(filePath)
    return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>
  }
  const blobRes = await get(storageKey, { access: 'private' })
  if (!blobRes || blobRes.statusCode !== 200 || !blobRes.stream) {
    throw new Error('Export archive not found in private storage.')
  }
  return blobRes.stream
}

async function resolvePrincipalFromUserId(
  institutionId: string,
  userId: string,
): Promise<AuthenticatedPrincipal> {
  const user = await prisma.user.findUnique({
    where: { institutionId_id: { institutionId, id: userId } },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  })
  if (!user || !user.isActive) {
    throw new Error('Export requester account is inactive or missing.')
  }
  return {
    userId: user.id,
    institutionId: user.institutionId,
    roleId: user.roleId,
    permissions: user.role.rolePermissions.map((rp) => rp.permission.key as PermissionKey),
  }
}

export async function claimNextQueuedExportJob(targetJobId?: string) {
  const candidate = targetJobId
    ? await prisma.exportJob.findFirst({ where: { id: targetJobId, status: 'QUEUED' } })
    : await prisma.exportJob.findFirst({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' } })

  if (!candidate) return null

  const updated = await prisma.exportJob.updateMany({
    where: { institutionId: candidate.institutionId, id: candidate.id, status: 'QUEUED' },
    data: { status: 'PROCESSING', startedAt: new Date(), errorMessage: null },
  })
  if (updated.count === 0) return null
  return candidate
}

async function fetchBlobStreamWithRetry(
  pathname: string,
  maxRetries = EXPORT_LIMITS.MAX_RETRIES,
): Promise<{ status: 'ok'; stream: ReadableStream<Uint8Array> } | { status: 'missing'; note: string } | { status: 'failed'; note: string }> {
  let lastErr = 'Storage retrieval failed'
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const blobRes = await get(pathname, { access: 'private' })
      if (!blobRes || !blobRes.stream) {
        return { status: 'missing', note: 'Private blob not found in storage' }
      }
      return { status: 'ok', stream: blobRes.stream }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : 'Transient storage error'
    }
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)))
    }
  }
  return { status: 'failed', note: lastErr }
}

async function persistArchiveOutput(
  institutionId: string,
  jobId: string,
  filename: string,
  tmpFilePath: string,
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const stream = createReadStream(tmpFilePath)
    const blob = await put(`exports/${institutionId}/${jobId}/${filename}`, stream, {
      access: 'private',
      contentType: 'application/zip',
    })
    return blob.pathname
  }

  // Local durable fallback when Vercel Blob token is absent (local dev / E2E tests)
  const localDir = join(tmpdir(), 'attainly-exports', sanitizeArchiveSegment(institutionId))
  await mkdir(localDir, { recursive: true })
  const destPath = join(localDir, `${sanitizeArchiveSegment(jobId)}.zip`)
  await copyFile(tmpFilePath, destPath)
  return `local://${destPath}`
}

export async function processExportJob(job: { institutionId: string; id: string }): Promise<{
  status: 'COMPLETED' | 'CANCELLED' | 'FAILED'
  errorMessage?: string
}> {
  const writer = new StreamingZipWriter(`export-${job.id}`)
  const usedPaths = new Set<string>()

  try {
    const record = await prisma.exportJob.findUnique({
      where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
    })
    if (!record) throw new Error('Export job record missing.')
    if (record.status === 'CANCELLED') return { status: 'CANCELLED' }
    if (!record.collectionId) throw new Error('Only inspection collection export jobs are supported.')

    const principal = await resolvePrincipalFromUserId(record.institutionId, record.requestedByUserId)
    const { collection, allowedDepts } = await resolveCollectionForExport(principal, record.collectionId)
    const institution = await prisma.institution.findUnique({
      where: { id: record.institutionId },
      select: { name: true, slug: true },
    })

    const requestedReportIds = collection.reportIds.length
      ? collection.reportIds
      : ['ACHIEVEMENTS', 'EVENTS', 'RESEARCH_PUBLICATIONS']
    const deptId = collection.departmentIds.length === 1 ? collection.departmentIds[0] : undefined
    const ayId = collection.academicYearIds.length === 1 ? collection.academicYearIds[0] : undefined

    const docs = await prisma.document.findMany({
      where: buildDocumentWhereForCollection(record.institutionId, collection, allowedDepts),
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
      take: EXPORT_LIMITS.MAX_DOCUMENTS_PER_PACKAGE,
      orderBy: { createdAt: 'desc' },
    })

    const totalItems = requestedReportIds.length + docs.length
    await prisma.exportJob.update({
      where: { institutionId_id: { institutionId: record.institutionId, id: record.id } },
      data: { totalItems, processedItems: 0 },
    })

    const reportSummaries: Array<{ reportType: string; rows: number; countingUnit: string }> = []
    const skippedReports: Array<{ reportType: string; reason: string }> = []
    let processedItems = 0

    for (const rt of requestedReportIds) {
      if (!(rt in REPORT_REGISTRY)) {
        skippedReports.push({ reportType: rt, reason: 'Unsupported report preset ID' })
        processedItems += 1
        continue
      }
      try {
        const result = await runStudioReport(principal, rt as ReportEntityType, {
          departmentId: deptId,
          academicYearId: ayId,
          includeUnverified: collection.includeUnverified,
          page: 1,
          pageSize: 5000,
        })
        const csvPath = allocateUniqueArchivePath(['reports'], `${rt.toLowerCase()}.csv`, usedPaths)
        const xlsxPath = allocateUniqueArchivePath(['reports'], `${rt.toLowerCase()}.xlsx`, usedPaths)
        await writer.addBuffer(csvPath, Buffer.from(buildCsvContent(result), 'utf8'))
        await writer.addBuffer(xlsxPath, await buildNativeXlsxBuffer(result))
        reportSummaries.push({
          reportType: rt,
          rows: result.totalRows ?? result.rows.length,
          countingUnit: result.countingUnit ?? result.subtitle,
        })
      } catch (err) {
        skippedReports.push({
          reportType: rt,
          reason: err instanceof Error ? err.message : 'Report generation failed',
        })
      }
      processedItems += 1
    }

    // Include matching recent ReportSnapshots for provenance
    const snapshots = await prisma.reportSnapshot.findMany({
      where: {
        institutionId: record.institutionId,
        entityType: { in: requestedReportIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    for (const snap of snapshots) {
      const snapPath = allocateUniqueArchivePath(
        ['snapshots'],
        `${snap.entityType.toLowerCase()}_${snap.id.slice(-8)}.json`,
        usedPaths,
      )
      await writer.addBuffer(snapPath, Buffer.from(JSON.stringify(snap, null, 2), 'utf8'))
    }

    await prisma.exportJob.update({
      where: { institutionId_id: { institutionId: record.institutionId, id: record.id } },
      data: { processedItems },
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
      expectedSha256: string | null
      actualSha256: string | null
      integrityStatus: 'VERIFIED' | 'MISMATCH' | 'UNVERIFIED_HASH' | 'NOT_INCLUDED'
      includedBinary: boolean
      note?: string
    }> = []

    let includedFiles = 0
    let missingFiles = 0
    let failedFiles = 0

    for (let i = 0; i < docs.length; i += EXPORT_LIMITS.FETCH_CONCURRENCY) {
      // Check cancellation before each batch
      const fresh = await prisma.exportJob.findUnique({
        where: { institutionId_id: { institutionId: record.institutionId, id: record.id } },
        select: { status: true },
      })
      if (!fresh || fresh.status === 'CANCELLED') {
        await writer.cleanup()
        return { status: 'CANCELLED' }
      }

      const batch = docs.slice(i, i + EXPORT_LIMITS.FETCH_CONCURRENCY)
      const fetched = await Promise.all(
        batch.map(async (d) => ({
          doc: d,
          res: await fetchBlobStreamWithRetry(d.pathname),
        })),
      )

      for (const { doc: d, res } of fetched) {
        const deptCode = sanitizeArchiveSegment(
          d.owner.student?.department?.code ?? d.owner.faculty?.department?.code ?? 'INSTITUTION',
        )
        const entityFolder = sanitizeArchiveSegment(d.entityType ?? 'GENERAL')
        const ownerSlug = sanitizeArchiveSegment(`${d.owner.firstName}_${d.owner.lastName}`)
        const archivePath = allocateUniqueArchivePath(
          ['evidence', deptCode, entityFolder],
          `${ownerSlug}_${d.id.slice(-6)}_${d.originalFilename}`,
          usedPaths,
        )

        if (res.status === 'ok') {
          try {
            const streamed = await writer.addStream(archivePath, res.stream)
            const integrityStatus = !d.sha256
              ? 'UNVERIFIED_HASH'
              : d.sha256.toLowerCase() === streamed.sha256.toLowerCase()
                ? 'VERIFIED'
                : 'MISMATCH'
            const note =
              integrityStatus === 'MISMATCH'
                ? `SHA-256 mismatch (expected ${d.sha256}, got ${streamed.sha256})`
                : undefined

            includedFiles += 1
            evidenceManifestEntries.push({
              id: d.id,
              originalFilename: d.originalFilename,
              archivePath,
              owner: `${d.owner.firstName} ${d.owner.lastName}`,
              department: deptCode,
              entityType: entityFolder,
              mimeType: d.mimeType,
              sizeBytes: d.sizeBytes,
              expectedSha256: d.sha256,
              actualSha256: streamed.sha256,
              integrityStatus,
              includedBinary: true,
              ...(note ? { note } : {}),
            })
          } catch (err) {
            failedFiles += 1
            evidenceManifestEntries.push({
              id: d.id,
              originalFilename: d.originalFilename,
              archivePath: null,
              owner: `${d.owner.firstName} ${d.owner.lastName}`,
              department: deptCode,
              entityType: entityFolder,
              mimeType: d.mimeType,
              sizeBytes: d.sizeBytes,
              expectedSha256: d.sha256,
              actualSha256: null,
              integrityStatus: 'NOT_INCLUDED',
              includedBinary: false,
              note: err instanceof Error ? err.message : 'Stream write error',
            })
          }
        } else {
          if (res.status === 'missing') missingFiles += 1
          else failedFiles += 1
          evidenceManifestEntries.push({
            id: d.id,
            originalFilename: d.originalFilename,
            archivePath: null,
            owner: `${d.owner.firstName} ${d.owner.lastName}`,
            department: deptCode,
            entityType: entityFolder,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            expectedSha256: d.sha256,
            actualSha256: null,
            integrityStatus: 'NOT_INCLUDED',
            includedBinary: false,
            note: res.note,
          })
        }
        processedItems += 1
      }

      await prisma.exportJob.update({
        where: { institutionId_id: { institutionId: record.institutionId, id: record.id } },
        data: { processedItems, includedFiles, missingFiles, failedFiles },
      })
    }

    const generatedAt = new Date().toISOString()
    const integrityMismatches = evidenceManifestEntries.filter((e) => e.integrityStatus === 'MISMATCH').length
    const manifest = {
      institution: institution?.name ?? 'Attainly Institution',
      collectionId: collection.id,
      exportJobId: record.id,
      title: collection.title,
      framework: collection.framework,
      verificationScope: collection.includeUnverified
        ? 'Includes provisional/unverified records'
        : 'Verified records only',
      disclaimer:
        'Attainly generates structured evidence packages and verified institutional reports. It does not calculate official accreditation grades or certify compliance.',
      generatedAt,
      summary: {
        reportsIncluded: reportSummaries.length,
        reportsSkipped: skippedReports.length,
        snapshotsIncluded: snapshots.length,
        evidenceTotal: evidenceManifestEntries.length,
        includedFiles,
        missingFiles,
        failedFiles,
        integrityMismatches,
      },
      reports: reportSummaries,
      skippedReports,
      evidenceDocuments: evidenceManifestEntries,
    }

    const humanIndex = [
      `# ${institution?.name ?? 'Attainly Institution'} — Inspection Evidence Package`,
      ``,
      `- **Collection:** ${collection.title}`,
      `- **Framework:** ${collection.framework}`,
      `- **Export Job ID:** ${record.id}`,
      `- **Verification Scope:** ${manifest.verificationScope}`,
      `- **Generated At:** ${generatedAt}`,
      `- **Evidence Summary:** ${includedFiles} included, ${missingFiles} missing, ${failedFiles} failed, ${integrityMismatches} hash mismatches`,
      `- **Disclaimer:** ${manifest.disclaimer}`,
      ``,
      `## Reports Included (${reportSummaries.length})`,
      ...reportSummaries.map(
        (r) => `- \`reports/${r.reportType.toLowerCase()}.xlsx\` & \`.csv\` — ${r.rows} rows (${r.countingUnit})`,
      ),
      ...(skippedReports.length
        ? [``, `## Skipped / Failed Reports (${skippedReports.length})`, ...skippedReports.map((s) => `- **${s.reportType}:** ${s.reason}`)]
        : []),
      ``,
      `## Supporting Evidence Files (${evidenceManifestEntries.length})`,
      ...evidenceManifestEntries.map(
        (e) =>
          `- ${e.includedBinary ? `\`${e.archivePath}\` [${e.integrityStatus}]` : `[NOT INCLUDED: ${e.note}]`} — ${e.originalFilename} (${e.owner}, ${e.department})`,
      ),
    ].join('\n')

    await writer.addBuffer('INDEX.md', Buffer.from(humanIndex, 'utf8'))
    await writer.addBuffer('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'))
    await writer.addBuffer(
      'evidence/evidence-index.csv',
      Buffer.from(
        [
          'ID,Filename,Owner,Department,EntityType,MimeType,SizeBytes,ExpectedSHA256,ActualSHA256,IntegrityStatus,IncludedBinary,ArchivePath,Note',
          ...evidenceManifestEntries.map((d) =>
            [
              d.id,
              d.originalFilename,
              d.owner,
              d.department,
              d.entityType,
              d.mimeType,
              d.sizeBytes,
              d.expectedSha256 ?? '',
              d.actualSha256 ?? '',
              d.integrityStatus,
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
    )

    const finalized = await writer.finalize()
    const safeSlug = collection.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    const outputFilename = `${institution?.slug ?? 'attainly'}-${collection.framework.toLowerCase()}-${safeSlug}.zip`
    const storageKey = await persistArchiveOutput(record.institutionId, record.id, outputFilename, finalized.filePath)
    const expiresAt = new Date(Date.now() + EXPORT_LIMITS.EXPIRY_HOURS * 60 * 60 * 1000)

    await prisma.exportJob.update({
      where: { institutionId_id: { institutionId: record.institutionId, id: record.id } },
      data: {
        status: 'COMPLETED',
        processedItems,
        includedFiles,
        missingFiles,
        failedFiles,
        outputSizeBytes: finalized.sizeBytes,
        outputSha256: finalized.sha256,
        outputFilename,
        storageKey,
        expiresAt,
        completedAt: new Date(),
      },
    })

    await prisma.inspectionCollection.update({
      where: { institutionId_id: { institutionId: record.institutionId, id: collection.id } },
      data: { lastExportedAt: new Date(), status: 'EXPORTED' },
    })

    return { status: 'COMPLETED' }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Export job failed unexpectedly.'
    await prisma.exportJob
      .update({
        where: { institutionId_id: { institutionId: job.institutionId, id: job.id } },
        data: { status: 'FAILED', errorMessage, completedAt: new Date() },
      })
      .catch(() => {})
    return { status: 'FAILED', errorMessage }
  } finally {
    await writer.cleanup()
  }
}
