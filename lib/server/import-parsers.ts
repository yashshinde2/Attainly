import 'server-only'
import { createHash } from 'node:crypto'
import ExcelJS from 'exceljs'
import { escapeCsvCell } from '@/lib/csv'
import { IMPORT_CATALOG, type ImportTypeKey } from '@/lib/import-types'

export const IMPORT_FILE_LIMITS = {
  MAX_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_ROWS: 5000,
} as const

export interface ParsedSpreadsheet {
  format: 'CSV' | 'XLSX'
  fileSha256: string
  headers: string[]
  rows: Array<Record<string, string>>
}

export function parseCsvMatrix(rawCsv: string): string[][] {
  const csv = rawCsv.charCodeAt(0) === 0xfeff ? rawCsv.slice(1) : rawCsv
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i]
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') {
        cell += '"'
        i += 1
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"' && cell.length === 0) {
      quoted = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i += 1
      row.push(cell)
      if (row.some((v) => v.trim().length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (quoted) {
    throw new Error('CSV contains an unterminated quoted field.')
  }
  row.push(cell)
  if (row.some((v) => v.trim().length > 0)) rows.push(row)
  return rows
}

function normalizeExcelCellValue(val: ExcelJS.CellValue): string {
  if (val === null || val === undefined) return ''
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10)
  }
  if (typeof val === 'object') {
    if ('text' in val && typeof val.text === 'string') return val.text.trim()
    if ('result' in val && val.result !== undefined && val.result !== null) {
      return String(val.result).trim()
    }
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((r) => r.text).join('').trim()
    }
  }
  return String(val).trim()
}

export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<ParsedSpreadsheet> {
  if (buffer.byteLength === 0) {
    throw new Error('Uploaded file is empty.')
  }
  if (buffer.byteLength > IMPORT_FILE_LIMITS.MAX_BYTES) {
    throw new Error('Import file must be 10 MB or smaller.')
  }

  const fileSha256 = createHash('sha256').update(buffer).digest('hex')
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.worksheets.find((ws) => ws.name !== 'Instructions') ?? workbook.worksheets[0]
    if (!sheet || sheet.rowCount < 2) {
      throw new Error('XLSX workbook must contain a header row and at least one data row.')
    }

    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const h = normalizeExcelCellValue(cell.value)
      if (h) headers[colNumber - 1] = h
    })

    const cleanHeaders = headers.filter((h) => Boolean(h))
    if (cleanHeaders.length === 0) {
      throw new Error('XLSX header row is empty.')
    }

    const rows: Array<Record<string, string>> = []
    for (let r = 2; r <= sheet.rowCount; r += 1) {
      const row = sheet.getRow(r)
      const record: Record<string, string> = {}
      let hasValue = false
      for (let c = 0; c < headers.length; c += 1) {
        const header = headers[c]
        if (!header) continue
        const val = normalizeExcelCellValue(row.getCell(c + 1).value)
        record[header] = val
        if (val.length > 0) hasValue = true
      }
      if (hasValue) {
        rows.push(record)
        if (rows.length > IMPORT_FILE_LIMITS.MAX_ROWS) {
          throw new Error(`Import exceeds maximum of ${IMPORT_FILE_LIMITS.MAX_ROWS} rows per job.`)
        }
      }
    }

    if (rows.length === 0) {
      throw new Error('No non-empty data rows found in XLSX worksheet.')
    }

    return { format: 'XLSX', fileSha256, headers: cleanHeaders, rows }
  }

  // Default to CSV
  const matrix = parseCsvMatrix(buffer.toString('utf8'))
  if (matrix.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.')
  }
  const headers = matrix[0].map((h) => h.trim()).filter(Boolean)
  if (headers.length === 0) {
    throw new Error('CSV header row is empty.')
  }
  const dataRows = matrix.slice(1)
  if (dataRows.length > IMPORT_FILE_LIMITS.MAX_ROWS) {
    throw new Error(`Import exceeds maximum of ${IMPORT_FILE_LIMITS.MAX_ROWS} rows per job.`)
  }

  const rows = dataRows.map((cells) => {
    const rec: Record<string, string> = {}
    for (let i = 0; i < headers.length; i += 1) {
      rec[headers[i]] = (cells[i] ?? '').trim()
    }
    return rec
  })

  return { format: 'CSV', fileSha256, headers, rows }
}

export function buildImportTemplateCsv(importType: ImportTypeKey): string {
  const def = IMPORT_CATALOG[importType]
  const headerLine = def.columns.map((c) => escapeCsvCell(c.key)).join(',')
  const sampleLines = def.sampleRows.map((row) =>
    def.columns.map((c) => escapeCsvCell(row[c.key] ?? '')).join(','),
  )
  return [headerLine, ...sampleLines].join('\n')
}

export async function buildImportTemplateXlsx(importType: ImportTypeKey): Promise<Buffer> {
  const def = IMPORT_CATALOG[importType]
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Attainly Import Center'
  workbook.created = new Date()

  const dataSheet = workbook.addWorksheet('Import Data', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  dataSheet.columns = def.columns.map((col) => ({
    header: col.key,
    key: col.key,
    width: Math.max(col.key.length + 4, 18),
  }))

  const headerRow = dataSheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  headerRow.height = 24

  for (const sample of def.sampleRows) {
    dataSheet.addRow(sample)
  }

  const guideSheet = workbook.addWorksheet('Instructions', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  guideSheet.columns = [
    { header: 'Column Key', key: 'key', width: 24 },
    { header: 'Label', key: 'label', width: 26 },
    { header: 'Required', key: 'required', width: 12 },
    { header: 'Type / Allowed Values', key: 'type', width: 36 },
    { header: 'Description', key: 'description', width: 44 },
    { header: 'Example', key: 'example', width: 28 },
  ]
  const guideHeader = guideSheet.getRow(1)
  guideHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  guideHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  guideHeader.height = 22

  guideSheet.addRow({
    key: 'MATCHING RULE',
    label: def.label,
    required: 'INFO',
    type: def.matchKeyDescription,
    description: def.description,
    example: 'Do not match by name alone',
  })

  for (const col of def.columns) {
    guideSheet.addRow({
      key: col.key,
      label: col.label,
      required: col.required ? 'REQUIRED' : 'Optional',
      type: col.enumValues ? `ENUM: ${col.enumValues.join(' | ')}` : col.type.toUpperCase(),
      description: col.description,
      example: col.example,
    })
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

export function buildImportErrorReportCsv(
  rows: Array<{
    rowNumber: number
    status: string
    matchKey: string | null
    errorMessage: string | null
    rawPayloadJson: unknown
  }>,
): string {
  const baseHeaders = ['rowNumber', 'status', 'matchKey', 'errorMessage']
  const extraKeys = new Set<string>()
  for (const r of rows) {
    if (r.rawPayloadJson && typeof r.rawPayloadJson === 'object' && !Array.isArray(r.rawPayloadJson)) {
      for (const k of Object.keys(r.rawPayloadJson as Record<string, unknown>)) {
        extraKeys.add(k)
      }
    }
  }
  const payloadHeaders = [...extraKeys]
  const lines = [[...baseHeaders, ...payloadHeaders].map(escapeCsvCell).join(',')]

  for (const r of rows) {
    const payload =
      r.rawPayloadJson && typeof r.rawPayloadJson === 'object' && !Array.isArray(r.rawPayloadJson)
        ? (r.rawPayloadJson as Record<string, unknown>)
        : {}
    const cells = [
      r.rowNumber,
      r.status,
      r.matchKey ?? '',
      r.errorMessage ?? '',
      ...payloadHeaders.map((k) => {
        const v = payload[k]
        return v === undefined || v === null ? '' : String(v)
      }),
    ]
    lines.push(cells.map(escapeCsvCell).join(','))
  }
  return lines.join('\n')
}
