import 'server-only'
import React from 'react'
import { readFile, rm } from 'node:fs/promises'
import { basename } from 'node:path'
import ExcelJS from 'exceljs'
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'
import { get as getBlob } from '@vercel/blob'
import { resolveLocalBlobPath } from '@/lib/server/repositories/blob-document-storage'
import {
  StreamingZipWriter,
  allocateUniqueArchivePath,
} from '@/lib/server/streaming-zip'
import type { GeneratedReportPackage } from './report-packages'

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 42,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#0f172a',
    lineHeight: 1.35,
  },
  headerBox: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
    marginBottom: 10,
  },
  institutionName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 8.5,
    color: '#475569',
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 11.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1d4ed8',
    marginTop: 6,
  },
  targetLine: {
    fontSize: 9,
    color: '#334155',
    marginTop: 2,
  },
  metaBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 0.75,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  metaTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    color: '#0f172a',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaKey: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    fontSize: 8,
  },
  metaVal: {
    flex: 1,
    color: '#0f172a',
    fontSize: 8,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  sectionHeader: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  sectionMeta: {
    fontSize: 7.5,
    color: '#475569',
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  metricPill: {
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 4,
    backgroundColor: '#ffffff',
  },
  metricLabel: {
    fontSize: 7,
    color: '#64748b',
  },
  metricValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  table: {
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 0.75,
    borderBottomColor: '#94a3b8',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  tableCellHeader: {
    flex: 1,
    padding: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#1e293b',
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 7.5,
    color: '#0f172a',
  },
  emptyNote: {
    fontSize: 8,
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  disclaimerBox: {
    marginTop: 8,
    borderTopWidth: 0.75,
    borderTopColor: '#cbd5e1',
    paddingTop: 6,
  },
  disclaimerText: {
    fontSize: 7.5,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
    fontSize: 7.5,
    color: '#64748b',
  },
})

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}

const PDF_ROW_CAP_PER_SECTION = 150

export async function buildReportPackagePdfBuffer(
  pkg: GeneratedReportPackage,
): Promise<Buffer> {
  const e = React.createElement

  const filterSummary =
    Object.entries(pkg.metadata.appliedFilters)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ') || 'None'

  const metaEntries: Array<[string, string]> = [
    ['Reporting Period', pkg.metadata.reportingPeriod],
    ['Applied Filters', filterSummary],
    ['Counting Units', pkg.metadata.countingUnits.join('; ')],
    ['Verification Scope', pkg.metadata.verificationScope],
    ['Exactness Note', pkg.metadata.exactnessNote],
    ['Excluded Missing Dates', String(pkg.metadata.excludedMissingDateCount)],
    ['Generated At', pkg.metadata.generatedAt],
    ['Snapshot ID', pkg.metadata.snapshotId],
  ]

  const doc = e(
    Document,
    { title: `${pkg.title} - ${pkg.targetLabel}`, author: pkg.institutionName },
    e(
      Page,
      { size: 'A4', style: pdfStyles.page, wrap: true },
      // Institutional Header
      e(
        View,
        { style: pdfStyles.headerBox },
        e(Text, { style: pdfStyles.institutionName }, pkg.institutionName),
        pkg.reportHeaderTitle
          ? e(Text, { style: pdfStyles.headerSubtitle }, pkg.reportHeaderTitle)
          : null,
        pkg.reportHeaderSubtitle
          ? e(Text, { style: pdfStyles.headerSubtitle }, pkg.reportHeaderSubtitle)
          : null,
        e(Text, { style: pdfStyles.reportTitle }, pkg.title),
        e(Text, { style: pdfStyles.targetLine }, `Scope Target: ${pkg.targetLabel}`),
      ),
      // Audit Metadata Box
      e(
        View,
        { style: pdfStyles.metaBox },
        e(Text, { style: pdfStyles.metaTitle }, 'Audit Metadata & Methodology'),
        ...metaEntries.map(([k, v], idx) =>
          e(
            View,
            { key: `meta-${idx}`, style: pdfStyles.metaRow },
            e(Text, { style: pdfStyles.metaKey }, k),
            e(Text, { style: pdfStyles.metaVal }, v),
          ),
        ),
      ),
      // Sections
      ...pkg.sections.map((section) => {
        const displayRows = section.rows.slice(0, PDF_ROW_CAP_PER_SECTION)
        const visibleColumns = section.columns.slice(0, 7)

        return e(
          View,
          { key: section.id, style: pdfStyles.sectionBlock },
          e(
            View,
            { style: pdfStyles.sectionHeader, wrap: false },
            e(Text, { style: pdfStyles.sectionTitle }, section.title),
          ),
          e(
            Text,
            { style: pdfStyles.sectionMeta },
            `Counting Unit: ${section.countingUnit} | Scope: ${section.verificationScope} | Rows: ${section.totalRows}` +
              (section.excludedMissingDateCount > 0
                ? ` | Excluded (missing date): ${section.excludedMissingDateCount}`
                : ''),
          ),
          section.summaryMetrics.length > 0
            ? e(
                View,
                { style: pdfStyles.metricsRow, wrap: false },
                ...section.summaryMetrics.map((m, idx) =>
                  e(
                    View,
                    { key: `${m.label}-${idx}`, style: pdfStyles.metricPill },
                    e(Text, { style: pdfStyles.metricLabel }, m.label),
                    e(
                      Text,
                      { style: pdfStyles.metricValue },
                      String(m.value),
                    ),
                  ),
                ),
              )
            : null,
          displayRows.length === 0
            ? e(
                Text,
                { style: pdfStyles.emptyNote },
                'No matching records in the selected reporting period and scope.',
              )
            : e(
                View,
                { style: pdfStyles.table },
                e(
                  View,
                  { style: pdfStyles.tableHeaderRow, wrap: false },
                  ...visibleColumns.map((col) =>
                    e(
                      Text,
                      { key: col.key, style: pdfStyles.tableCellHeader },
                      col.label,
                    ),
                  ),
                ),
                ...displayRows.map((row, rowIdx) =>
                  e(
                    View,
                    { key: `r-${rowIdx}`, style: pdfStyles.tableRow, wrap: false },
                    ...visibleColumns.map((col) =>
                      e(
                        Text,
                        { key: col.key, style: pdfStyles.tableCell },
                        formatCellValue(row[col.key]),
                      ),
                    ),
                  ),
                ),
              ),
          section.totalRows > PDF_ROW_CAP_PER_SECTION
            ? e(
                Text,
                { style: pdfStyles.emptyNote },
                `Showing first ${PDF_ROW_CAP_PER_SECTION} of ${section.totalRows} rows in PDF. Export XLSX for the complete dataset.`,
              )
            : null,
        )
      }),
      // Disclaimer
      e(
        View,
        { style: pdfStyles.disclaimerBox, wrap: false },
        e(Text, { style: pdfStyles.disclaimerText }, pkg.metadata.disclaimer),
      ),
      // Fixed Page Footer
      e(
        View,
        { style: pdfStyles.footer, fixed: true },
        e(Text, null, `${pkg.institutionName} • Snapshot ${pkg.snapshotId}`),
        e(Text, {
          render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`,
        }),
      ),
    ),
  )

  return renderToBuffer(doc)
}

function sanitizeSheetName(name: string, used: Set<string>): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, ' ').replace(/\s+/g, ' ').trim()
  let base = cleaned.slice(0, 31) || 'Section'
  let candidate = base
  let counter = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${counter}`
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
    counter += 1
  }
  used.add(candidate.toLowerCase())
  return candidate
}

export async function buildReportPackageXlsxBuffer(
  pkg: GeneratedReportPackage,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = pkg.institutionName
  workbook.created = new Date(pkg.metadata.generatedAt)

  const usedSheetNames = new Set<string>(['cover & audit metadata'])
  const cover = workbook.addWorksheet('Cover & Audit Metadata')
  cover.columns = [
    { key: 'field', width: 30 },
    { key: 'value', width: 80 },
  ]

  const coverRows: Array<[string, string]> = [
    ['Institution', pkg.institutionName],
    ['Report Header Title', pkg.reportHeaderTitle ?? '—'],
    ['Report Header Subtitle', pkg.reportHeaderSubtitle ?? '—'],
    ['Package Title', pkg.title],
    ['Package Key', pkg.packageKey],
    ['Scope Target', pkg.targetLabel],
    ['Reporting Period', pkg.metadata.reportingPeriod],
    [
      'Applied Filters',
      Object.entries(pkg.metadata.appliedFilters)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ') || 'None',
    ],
    ['Counting Units', pkg.metadata.countingUnits.join('; ')],
    ['Verification Scope', pkg.metadata.verificationScope],
    ['Exactness Note', pkg.metadata.exactnessNote],
    ['Excluded Missing Dates', String(pkg.metadata.excludedMissingDateCount)],
    ['Generated At', pkg.metadata.generatedAt],
    ['Snapshot ID', pkg.metadata.snapshotId],
    ['Disclaimer', pkg.metadata.disclaimer],
  ]

  const titleRow = cover.addRow(['Field', 'Value'])
  titleRow.font = { bold: true }
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2E8F0' },
  }
  for (const [k, v] of coverRows) {
    cover.addRow([k, v])
  }

  cover.addRow([])
  const secHeader = cover.addRow(['Included Sections', 'Row Count / Counting Unit'])
  secHeader.font = { bold: true }
  for (const s of pkg.sections) {
    cover.addRow([s.title, `${s.totalRows} rows (${s.countingUnit})`])
  }

  for (const section of pkg.sections) {
    const sheetName = sanitizeSheetName(section.title, usedSheetNames)
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 4 }],
    })

    sheet.addRow([section.title]).font = { bold: true, size: 12 }
    sheet.addRow([
      `Counting Unit: ${section.countingUnit} | Scope: ${section.verificationScope} | Excluded Missing Dates: ${section.excludedMissingDateCount}`,
    ])
    const summaryText = section.summaryMetrics
      .map((m) => `${m.label}: ${m.value === null ? 'Unavailable' : m.value}`)
      .join(' | ')
    sheet.addRow([summaryText || 'Summary: —'])

    const headerRow = sheet.addRow(section.columns.map((c) => c.label))
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    }

    for (const row of section.rows) {
      sheet.addRow(section.columns.map((c) => formatCellValue(row[c.key])))
    }

    section.columns.forEach((col, idx) => {
      const column = sheet.getColumn(idx + 1)
      column.width = Math.min(Math.max(col.label.length + 6, 16), 42)
    })
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

async function readAuthorizedEvidenceBuffer(
  institutionId: string,
  pathname: string,
): Promise<Buffer | null> {
  const expectedPrefix = `institutions/${institutionId}/`
  if (!pathname.startsWith(expectedPrefix)) {
    return null
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      return await readFile(resolveLocalBlobPath(pathname))
    } catch {
      return null
    }
  }

  try {
    const result = await getBlob(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null
    }
    const arrayBuf = await new Response(result.stream).arrayBuffer()
    return Buffer.from(arrayBuf)
  } catch {
    return null
  }
}

export async function buildReportPackageZipBuffer(
  institutionId: string,
  pkg: GeneratedReportPackage,
): Promise<Buffer> {
  const pdfBuffer = await buildReportPackagePdfBuffer(pkg)
  const xlsxBuffer = await buildReportPackageXlsxBuffer(pkg)

  const writer = new StreamingZipWriter('attainly-pkg')
  const usedPaths = new Set<string>(['report-package.pdf', 'report-package.xlsx', 'manifest.json'])
  const includedEvidence: Array<{ sourcePath: string; archivePath: string; bytes: number }> = []
  const skippedEvidence: Array<{ sourcePath: string; reason: string }> = []

  try {
    await writer.open()
    await writer.addBuffer('report-package.pdf', pdfBuffer)
    await writer.addBuffer('report-package.xlsx', xlsxBuffer)

    for (const rawPath of pkg.evidencePaths) {
      if (!rawPath.startsWith(`institutions/${institutionId}/`)) {
        skippedEvidence.push({
          sourcePath: rawPath,
          reason: 'Excluded: outside authorized institution storage prefix',
        })
        continue
      }
      const data = await readAuthorizedEvidenceBuffer(institutionId, rawPath)
      if (!data) {
        skippedEvidence.push({
          sourcePath: rawPath,
          reason: 'Evidence file not found in active storage',
        })
        continue
      }
      const archivePath = allocateUniqueArchivePath(
        ['evidence'],
        basename(rawPath) || 'document.bin',
        usedPaths,
      )
      await writer.addBuffer(archivePath, data)
      includedEvidence.push({
        sourcePath: rawPath,
        archivePath,
        bytes: data.length,
      })
    }

    const manifest = {
      snapshotId: pkg.snapshotId,
      packageKey: pkg.packageKey,
      title: pkg.title,
      institutionName: pkg.institutionName,
      targetLabel: pkg.targetLabel,
      metadata: pkg.metadata,
      sectionSummaries: pkg.sections.map((s) => ({
        id: s.id,
        title: s.title,
        totalRows: s.totalRows,
        countingUnit: s.countingUnit,
        verificationScope: s.verificationScope,
        excludedMissingDateCount: s.excludedMissingDateCount,
      })),
      includedEvidence,
      skippedEvidence,
    }

    await writer.addBuffer(
      'manifest.json',
      Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
    )

    const finalized = await writer.finalize()
    return await readFile(finalized.filePath)
  } finally {
    await rm(writer.filePath, { force: true }).catch(() => undefined)
  }
}
