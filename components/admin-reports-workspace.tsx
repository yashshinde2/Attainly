'use client'

import { useState, useTransition } from 'react'
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  Download,
  FileText,
  Loader2,
  Play,
  Save,
  ShieldAlert,
  Trash2,
  UsersRound,
} from 'lucide-react'
import {
  deleteSavedReportAction,
  runReportAction,
  saveReportAction,
} from '@/app/actions/reports'
import {
  buildCsvContent,
  type ReportEntityType,
  type ReportFilterValues,
  type ReportTableResult,
} from '@/lib/report-types'
import type { SavedReport } from '@/generated/prisma/client'
import type { DepartmentWithCourseCount } from '@/lib/server/repositories/department-repository'

const QUICK_REPORT_CARDS: Array<{
  entityType: ReportEntityType
  title: string
  description: string
  icon: typeof Award
}> = [
  {
    entityType: 'ACHIEVEMENTS',
    title: 'Achievement Stats',
    description: 'Verified achievements grouped by category and status.',
    icon: Award,
  },
  {
    entityType: 'EVENTS',
    title: 'Event Participation',
    description: 'Participation counts by event type and role.',
    icon: CalendarDays,
  },
  {
    entityType: 'CERT_RESEARCH_PATENT',
    title: 'Certs, Research & Patents',
    description: 'Grouped by record type, department, and batch.',
    icon: BookOpen,
  },
  {
    entityType: 'VERIFICATION_AGING',
    title: 'Verification Aging',
    description: 'Pending claims older than 7, 14, and 30 days.',
    icon: Clock,
  },
  {
    entityType: 'COMPLETENESS_LAGGARDS',
    title: 'Completeness Laggards',
    description: 'Students & faculty below profile completeness threshold.',
    icon: UsersRound,
  },
  {
    entityType: 'CRITERION_COVERAGE',
    title: 'Criterion Coverage & Gaps',
    description: 'Verified items per accreditation criterion with zero-count gaps.',
    icon: ShieldAlert,
  },
]

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'

export function AdminReportsWorkspace({
  departments,
  initialSavedReports,
  initialResult = null,
}: {
  departments: DepartmentWithCourseCount[]
  initialSavedReports: SavedReport[]
  initialResult?: ReportTableResult | null
}) {
  const [activeResult, setActiveResult] = useState<ReportTableResult | null>(initialResult)
  const [savedReports, setSavedReports] = useState<SavedReport[]>(initialSavedReports)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Custom report filter state
  const [entityType, setEntityType] = useState<ReportEntityType>(
    initialResult?.entityType ?? 'ACHIEVEMENTS',
  )
  const [departmentId, setDepartmentId] = useState('')
  const [batchYear, setBatchYear] = useState('')
  const [eventType, setEventType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [threshold, setThreshold] = useState('60')
  const [includeUnverified, setIncludeUnverified] = useState(false)
  const [reportName, setReportName] = useState('')

  const currentFilters = (): ReportFilterValues => ({
    departmentId: departmentId || undefined,
    batchYear: batchYear ? Number(batchYear) : undefined,
    eventType: eventType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    threshold: threshold ? Number(threshold) : 60,
    includeUnverified,
  })

  const executeReport = (type: ReportEntityType, filters: ReportFilterValues = {}) => {
    setErrorMsg(null)
    setSaveMessage(null)
    startTransition(async () => {
      const res = await runReportAction({ entityType: type, filters })
      if (res.status === 'error') {
        setErrorMsg(res.message)
      } else {
        setActiveResult(res.result)
      }
    })
  }

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportName.trim()) return
    setErrorMsg(null)
    setSaveMessage(null)
    const filters = currentFilters()
    startTransition(async () => {
      const res = await saveReportAction({
        name: reportName.trim(),
        entityType,
        filters,
      })
      if (res.status === 'error') {
        setErrorMsg(res.message)
      } else {
        setSavedReports((prev) => [res.savedReport, ...prev])
        setReportName('')
        setSaveMessage(`Saved "${res.savedReport.name}".`)
      }
    })
  }

  const handleRunSavedReport = (saved: SavedReport) => {
    const f = (saved.filters ?? {}) as ReportFilterValues
    const type = saved.entityType as ReportEntityType
    setEntityType(type)
    setDepartmentId(f.departmentId ?? '')
    setBatchYear(f.batchYear ? String(f.batchYear) : '')
    setEventType(f.eventType ?? '')
    setDateFrom(f.dateFrom ?? '')
    setDateTo(f.dateTo ?? '')
    setThreshold(f.threshold !== undefined ? String(f.threshold) : '60')
    setIncludeUnverified(Boolean(f.includeUnverified))
    executeReport(type, f)
  }

  const handleDeleteSavedReport = (id: string) => {
    setErrorMsg(null)
    startTransition(async () => {
      const res = await deleteSavedReportAction(id)
      if (res.status === 'error') {
        setErrorMsg(res.message)
      } else {
        setSavedReports((prev) => prev.filter((r) => r.id !== id))
      }
    })
  }

  const handleDownloadCsv = () => {
    if (!activeResult) return
    const csv = buildCsvContent(activeResult)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeResult.entityType.toLowerCase()}_report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPdf = async () => {
    if (!activeResult) return
    setDownloadingPdf(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const { ReportPdfDocument } = await import('@/components/report-pdf-document')
      const blob = await pdf(<ReportPdfDocument result={activeResult} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeResult.entityType.toLowerCase()}_report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Section A: Quick Reports */}
      <section aria-labelledby="quick-reports-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="quick-reports-heading" className="text-lg font-semibold">
              Quick Reports
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              One-click institutional reports. Counts verified records by default.
            </p>
          </div>
          {isPending && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <Loader2 size={14} className="animate-spin" /> Running query...
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_REPORT_CARDS.map((card) => {
            const Icon = card.icon
            const isActive = activeResult?.entityType === card.entityType
            return (
              <button
                key={card.entityType}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setEntityType(card.entityType)
                  executeReport(card.entityType, { includeUnverified: false, threshold: 60 })
                }}
                className={`group flex flex-col items-start rounded-2xl border p-4 text-left transition hover:border-primary/50 hover:shadow-sm disabled:opacity-60 ${
                  isActive ? 'border-primary bg-primary/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Icon size={17} />
                  </span>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">
                    Run &rarr;
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      {errorMsg && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Active Report Result Table */}
      {activeResult && (
        <section
          aria-labelledby="report-result-heading"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-primary" />
                <h2 id="report-result-heading" className="text-lg font-semibold">
                  {activeResult.title}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeResult.subtitle} &bull; {activeResult.rows.length}{' '}
                {activeResult.rows.length === 1 ? 'row' : 'rows'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                <Download size={14} /> Export CSV
              </button>
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                {downloadingPdf ? 'Generating PDF...' : 'Export PDF'}
              </button>
            </div>
          </div>

          {activeResult.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No matching records found for the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {activeResult.columns.map((col) => (
                      <th key={col.key} className="pb-3 pr-4">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeResult.rows.map((row, idx) => {
                    const isGap = Boolean(row.isGap)
                    return (
                      <tr
                        key={idx}
                        className={`transition hover:bg-muted/40 ${isGap ? 'bg-amber-500/5' : ''}`}
                      >
                        {activeResult.columns.map((col) => {
                          const val = row[col.key]
                          if (col.key === 'status' && activeResult.entityType === 'CRITERION_COVERAGE') {
                            return (
                              <td key={col.key} className="py-3 pr-4">
                                {isGap ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                    <AlertTriangle size={12} /> {String(val)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                    {String(val)}
                                  </span>
                                )}
                              </td>
                            )
                          }
                          return (
                            <td key={col.key} className="py-3 pr-4 text-xs text-foreground">
                              {val !== undefined && val !== null ? String(val) : ''}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Section B: Custom Report Builder & Saved Reports */}
      <section aria-labelledby="custom-report-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 id="custom-report-heading" className="text-lg font-semibold">
          Custom Report
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter institutional data and save reusable report definitions.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="report-entity-type" className="text-xs font-medium text-foreground">
              Report Type
            </label>
            <select
              id="report-entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as ReportEntityType)}
              className={fieldClass}
            >
              <option value="ACHIEVEMENTS">Achievements by Category</option>
              <option value="EVENTS">Event Participation</option>
              <option value="CERT_RESEARCH_PATENT">Certifications, Research & Patents</option>
              <option value="VERIFICATION_AGING">Verification Queue Aging</option>
              <option value="COMPLETENESS_LAGGARDS">Profile Completeness Laggards</option>
              <option value="CRITERION_COVERAGE">Accreditation Criterion Coverage</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-department" className="text-xs font-medium text-foreground">
              Department
            </label>
            <select
              id="report-department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className={fieldClass}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-batch-year" className="text-xs font-medium text-foreground">
              Batch / Admission Year
            </label>
            <input
              id="report-batch-year"
              type="number"
              placeholder="e.g. 2024"
              value={batchYear}
              onChange={(e) => setBatchYear(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="report-date-from" className="text-xs font-medium text-foreground">
              Date From
            </label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="report-date-to" className="text-xs font-medium text-foreground">
              Date To
            </label>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={fieldClass}
            />
          </div>

          {entityType === 'EVENTS' && (
            <div>
              <label htmlFor="report-event-type" className="text-xs font-medium text-foreground">
                Event Type
              </label>
              <input
                id="report-event-type"
                type="text"
                placeholder="e.g. HACKATHON, WORKSHOP"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}

          {entityType === 'COMPLETENESS_LAGGARDS' && (
            <div>
              <label htmlFor="report-threshold" className="text-xs font-medium text-foreground">
                Completeness Threshold (%)
              </label>
              <input
                id="report-threshold"
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={includeUnverified}
              onChange={(e) => setIncludeUnverified(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            <span>Include pending / unverified records</span>
          </label>

          <button
            type="button"
            disabled={isPending}
            onClick={() => executeReport(entityType, currentFilters())}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Play size={15} /> Run Custom Report
          </button>
        </div>

        {/* Save this report */}
        <form onSubmit={handleSaveReport} className="mt-6 flex flex-wrap items-end gap-3 border-t border-border pt-5">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="save-report-name" className="text-xs font-medium text-foreground">
              Save this report configuration
            </label>
            <input
              id="save-report-name"
              type="text"
              required
              placeholder="e.g. NAAC Verified Achievements 2026"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !reportName.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            <Save size={15} /> Save this report
          </button>
        </form>

        {saveMessage && (
          <p role="status" className="mt-2 text-xs font-medium text-primary">
            {saveMessage}
          </p>
        )}

        {/* Saved Reports List */}
        <div className="mt-6 border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-foreground">Saved Reports</h3>
          {savedReports.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No saved reports yet. Configure filters above and click &ldquo;Save this report&rdquo;.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-border rounded-xl border border-border">
              {savedReports.map((saved) => (
                <div
                  key={saved.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{saved.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {saved.entityType.replaceAll('_', ' ')} &bull; Saved{' '}
                      {new Date(saved.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRunSavedReport(saved)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                    >
                      <Play size={12} /> Run
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteSavedReport(saved.id)}
                      aria-label={`Delete ${saved.name}`}
                      className="inline-flex items-center rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
