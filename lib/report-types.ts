import { escapeCsvCell } from './csv'

export type ReportEntityType =
  | 'ACHIEVEMENTS'
  | 'EVENTS'
  | 'CERT_RESEARCH_PATENT'
  | 'VERIFICATION_AGING'
  | 'COMPLETENESS_LAGGARDS'
  | 'CRITERION_COVERAGE'

export interface ReportFilterValues {
  departmentId?: string
  batchYear?: number | null
  eventType?: string
  dateFrom?: string
  dateTo?: string
  includeUnverified?: boolean
  threshold?: number
}

export interface ReportColumn {
  key: string
  label: string
}

export interface ReportTableResult {
  entityType: ReportEntityType
  title: string
  subtitle: string
  columns: ReportColumn[]
  rows: Array<Record<string, string | number | boolean>>
  generatedAt: string
}

export function buildCsvContent(result: ReportTableResult): string {
  const header = result.columns.map((c) => escapeCsvCell(c.label)).join(',')
  const body = result.rows.map((row) =>
    result.columns.map((c) => escapeCsvCell(row[c.key])).join(','),
  )
  return [header, ...body].join('\r\n')
}
