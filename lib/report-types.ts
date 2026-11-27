import { escapeCsvCell } from './csv'
import type { ReportEntityType } from './reporting-registry'

export type { ReportEntityType }

export interface ReportFilterValues {
  departmentId?: string
  courseId?: string
  academicYearId?: string
  batchYear?: number | null
  semester?: number | null
  categoryCode?: string
  eventType?: string
  participationLevel?: string
  result?: string
  verificationStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'ALL'
  dateFrom?: string
  dateTo?: string
  includeUnverified?: boolean
  includeMissingActivityDates?: boolean
  threshold?: number
  groupBy?: string
  drillDownValue?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  selectedColumns?: string[]
}

export interface ReportColumn {
  key: string
  label: string
}

export interface ReportSummaryMetric {
  label: string
  value: string | number
}

export interface ReportTableResult {
  entityType: ReportEntityType
  title: string
  subtitle: string
  institutionName?: string
  countingUnit?: string
  dateFieldSemantics?: string
  verificationScope?: string
  excludedMissingDateCount?: number
  groupedBy?: string
  drillDownValue?: string
  appliedFilters?: Record<string, string>
  summaryMetrics?: ReportSummaryMetric[]
  columns: ReportColumn[]
  rows: Array<Record<string, string | number | boolean>>
  totalRows?: number
  page?: number
  pageSize?: number
  generatedAt: string
}

export function buildCsvContent(result: ReportTableResult): string {
  const metaLines: string[] = [
    `# Institution,${escapeCsvCell(result.institutionName ?? 'Attainly Institution')}`,
    `# Report,${escapeCsvCell(result.title)}`,
    `# Metric Definition,${escapeCsvCell(result.countingUnit ?? result.subtitle)}`,
    `# Verification Scope,${escapeCsvCell(result.verificationScope ?? 'Verified records only')}`,
    `# Generated At,${escapeCsvCell(result.generatedAt)}`,
  ]
  const header = result.columns.map((c) => escapeCsvCell(c.label)).join(',')
  const body = result.rows.map((row) =>
    result.columns.map((c) => escapeCsvCell(row[c.key])).join(','),
  )
  return [...metaLines, '', header, ...body].join('\r\n')
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generates a SpreadsheetML (.xls) workbook compatible with Microsoft Excel and LibreOffice Calc
 * containing both a Metadata/Audit sheet and the Data sheet.
 */
export function buildExcelXmlContent(result: ReportTableResult): string {
  const metaRows = [
    ['Institution', result.institutionName ?? 'Attainly Institution'],
    ['Report Title', result.title],
    ['Metric / Counting Unit', result.countingUnit ?? result.subtitle],
    ['Date Semantics', result.dateFieldSemantics ?? 'Activity Date'],
    ['Verification Scope', result.verificationScope ?? 'Verified records only'],
    ['Generated At', result.generatedAt],
    ['Total Rows', String(result.totalRows ?? result.rows.length)],
  ]

  const metaXml = metaRows
    .map(
      ([k, v]) =>
        `<Row><Cell><Data ss:Type="String">${escapeXml(k)}</Data></Cell><Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell></Row>`,
    )
    .join('')

  const headerXml = `<Row>${result.columns
    .map((c) => `<Cell><Data ss:Type="String">${escapeXml(c.label)}</Data></Cell>`)
    .join('')}</Row>`

  const dataXml = result.rows
    .map((row) => {
      const cells = result.columns
        .map((c) => {
          const val = row[c.key]
          const isNum = typeof val === 'number' && Number.isFinite(val)
          return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(val ?? '')}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Report Data">
    <Table>${headerXml}${dataXml}</Table>
  </Worksheet>
  <Worksheet ss:Name="Metadata &amp; Audit">
    <Table>${metaXml}</Table>
  </Worksheet>
</Workbook>`
}
