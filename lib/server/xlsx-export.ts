import 'server-only'
import ExcelJS from 'exceljs'
import type { ReportTableResult } from '@/lib/report-types'

/**
 * Generates a native .xlsx workbook with formatted headers, typed columns,
 * auto-fitted widths, and an Audit Metadata worksheet.
 */
export async function buildNativeXlsxBuffer(result: ReportTableResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = result.institutionName ?? 'Attainly'
  workbook.created = new Date(result.generatedAt)

  const dataSheet = workbook.addWorksheet('Report Data', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  dataSheet.columns = result.columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: Math.max(col.label.length + 4, 16),
  }))

  const headerRow = dataSheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  headerRow.height = 24

  for (const row of result.rows) {
    const rowValues: Record<string, string | number | boolean> = {}
    for (const col of result.columns) {
      const val = row[col.key]
      rowValues[col.key] = val ?? ''
    }
    const added = dataSheet.addRow(rowValues)
    added.eachCell((cell, colNumber) => {
      const col = result.columns[colNumber - 1]
      const strLen = String(cell.value ?? '').length
      if (col && strLen + 4 > (dataSheet.getColumn(colNumber).width ?? 16)) {
        dataSheet.getColumn(colNumber).width = Math.min(strLen + 4, 48)
      }
    })
  }

  const metaSheet = workbook.addWorksheet('Metadata & Audit')
  metaSheet.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 64 },
  ]
  metaSheet.getRow(1).font = { bold: true }

  const metaEntries: Array<[string, string]> = [
    ['Institution', result.institutionName ?? 'Attainly Institution'],
    ['Report Title', result.title],
    ['Report Type', result.entityType],
    ['Metric / Counting Unit', result.countingUnit ?? result.subtitle],
    ['Date Field Semantics', result.dateFieldSemantics ?? 'Activity Date'],
    ['Verification Scope', result.verificationScope ?? 'Verified records only'],
    ['Generated At', result.generatedAt],
    ['Total Rows', String(result.totalRows ?? result.rows.length)],
    [
      'Applied Filters',
      result.appliedFilters && Object.keys(result.appliedFilters).length > 0
        ? JSON.stringify(result.appliedFilters)
        : 'None',
    ],
  ]

  for (const [field, value] of metaEntries) {
    metaSheet.addRow({ field, value })
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
