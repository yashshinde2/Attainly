import ExcelJS from 'exceljs'
import { escapeCsvCell } from '@/lib/csv'
import { IMPORT_CATALOG, type ImportTypeId } from './catalog'

export interface ParsedSpreadsheet {
  fileFormat: 'CSV' | 'XLSX'
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCsvMatrix(csv: string): string[][] {
  const cleaned = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i]
    if (quoted) {
      if (ch === '"' && cleaned[i + 1] === '"') {
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
      if (ch === '\r' && cleaned[i + 1] === '\n') i += 1
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

function matrixToObjects(matrix: string[][]): { headers: string[]; rows: Record<string, string>[] } {
  if (matrix.length === 0) {
    throw new Error('The uploaded file is empty.')
  }
  const rawHeaders = matrix[0].map((h) => h.trim())
  const headers = rawHeaders.filter((h) => h.length > 0)
  if (headers.length === 0) {
    throw new Error('The uploaded file does not contain a valid header row.')
  }

  const rows: Record<string, string>[] = []
  for (let r = 1; r < matrix.length; r += 1) {
    const record: Record<string, string> = {}
    let hasValue = false
    for (let c = 0; c < rawHeaders.length; c += 1) {
      const header = rawHeaders[c]
      if (!header) continue
      const val = (matrix[r][c] ?? '').trim()
      if (val.length > 0) hasValue = true
      record[header] = val
    }
    if (hasValue) rows.push(record)
  }

  return { headers, rows }
}

function stringifyExcelCell(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('result' in value && value.result !== undefined && value.result !== null) {
      if (value.result instanceof Date) return value.result.toISOString().slice(0, 10)
      return String(value.result).trim()
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim()
    }
  }
  return String(value).trim()
}

export async function parseSpreadsheetBuffer(buffer: Buffer, fileName: string): Promise<ParsedSpreadsheet> {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.xlsx')) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    const sheet = workbook.worksheets[0]
    if (!sheet) {
      throw new Error('The XLSX workbook does not contain any worksheets.')
    }
    const matrix: string[][] = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as ExcelJS.CellValue[]
      // ExcelJS row.values is 1-indexed (index 0 is empty)
      const cells = values.slice(1).map(stringifyExcelCell)
      if (cells.some((c) => c.length > 0)) {
        matrix.push(cells)
      }
    })
    const { headers, rows } = matrixToObjects(matrix)
    return { fileFormat: 'XLSX', headers, rows }
  }

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const csv = buffer.toString('utf8')
    const matrix = parseCsvMatrix(csv)
    const { headers, rows } = matrixToObjects(matrix)
    return { fileFormat: 'CSV', headers, rows }
  }

  throw new Error('Unsupported file format. Please upload a .csv or .xlsx spreadsheet.')
}

export function buildTemplateCsv(typeId: ImportTypeId): string {
  const spec = IMPORT_CATALOG[typeId]
  const headerLine = spec.fields.map((f) => escapeCsvCell(f.key)).join(',')
  const sampleLine = spec.fields.map((f) => escapeCsvCell(f.example)).join(',')
  return `${headerLine}\n${sampleLine}\n`
}

export async function buildTemplateXlsxBuffer(typeId: ImportTypeId): Promise<Buffer> {
  const spec = IMPORT_CATALOG[typeId]
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Attainly Import Center'
  workbook.created = new Date()

  const dataSheet = workbook.addWorksheet('Template Data', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  dataSheet.columns = spec.fields.map((f) => ({
    header: f.key,
    key: f.key,
    width: Math.max(f.key.length + 6, f.example.length + 6, 18),
  }))

  const headerRow = dataSheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  }
  headerRow.height = 24

  const sampleRow: Record<string, string> = {}
  for (const field of spec.fields) {
    sampleRow[field.key] = field.example
  }
  dataSheet.addRow(sampleRow)

  const guideSheet = workbook.addWorksheet('Instructions')
  guideSheet.columns = [
    { header: 'Column Key', key: 'key', width: 24 },
    { header: 'Label', key: 'label', width: 28 },
    { header: 'Required', key: 'required', width: 12 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Allowed Values / Format', key: 'rules', width: 38 },
    { header: 'Description', key: 'description', width: 48 },
    { header: 'Example', key: 'example', width: 28 },
  ]
  guideSheet.getRow(1).font = { bold: true }
  guideSheet.addRow({
    key: 'MATCHING RULE',
    label: spec.label,
    required: '',
    type: '',
    rules: spec.matchKeyDescription,
    description: spec.description,
    example: '',
  })

  for (const f of spec.fields) {
    guideSheet.addRow({
      key: f.key,
      label: f.label,
      required: f.required ? 'YES' : 'Optional',
      type: f.type,
      rules: f.enumValues ? f.enumValues.join(' | ') : f.type === 'date' ? 'YYYY-MM-DD' : '-',
      description: f.description,
      example: f.example,
    })
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}

export interface ErrorReportRow {
  rowNumber: number
  status: string
  matchKey?: string | null
  errorMessage?: string | null
  rawPayload?: Record<string, unknown>
}

export function buildErrorReportCsv(rows: ErrorReportRow[]): string {
  const header = ['Row Number', 'Status', 'Match Key', 'Error / Reason', 'Raw Data'].map(escapeCsvCell).join(',')
  const lines = rows.map((row) =>
    [
      row.rowNumber,
      row.status,
      row.matchKey ?? '',
      row.errorMessage ?? '',
      row.rawPayload ? JSON.stringify(row.rawPayload) : '',
    ]
      .map(escapeCsvCell)
      .join(','),
  )
  return [header, ...lines].join('\n')
}
