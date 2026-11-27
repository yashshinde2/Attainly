'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Play,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import {
  createReportSnapshotAction,
  deleteSavedReportAction,
  runReportAction,
  saveReportAction,
} from '@/app/actions/reports'
import {
  buildCsvContent,
  buildExcelXmlContent,
  type ReportEntityType,
  type ReportFilterValues,
  type ReportTableResult,
} from '@/lib/report-types'
import { REPORT_PRESETS_LIST, REPORT_REGISTRY } from '@/lib/reporting-registry'
import type { ReportSnapshot, SavedReport } from '@/generated/prisma/client'
import type { DepartmentWithCourseCount } from '@/lib/server/repositories/department-repository'

export function AdminReportsWorkspace({
  departments,
  academicYears,
  initialSavedReports,
  initialSnapshots,
  initialReport,
}: {
  departments: DepartmentWithCourseCount[]
  academicYears: Array<{ id: string; label: string }>
  initialSavedReports: SavedReport[]
  initialSnapshots: ReportSnapshot[]
  initialReport: ReportTableResult | null
}) {
  const [selectedType, setSelectedType] = useState<ReportEntityType>(
    initialReport?.entityType ?? 'ACHIEVEMENTS',
  )
  const [filters, setFilters] = useState<ReportFilterValues>({
    includeUnverified: false,
    verificationStatus: 'VERIFIED',
    page: 1,
    pageSize: 25,
  })
  const [result, setResult] = useState<ReportTableResult | null>(initialReport)
  const [savedReports, setSavedReports] = useState<SavedReport[]>(initialSavedReports)
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>(initialSnapshots)
  const [saveName, setSaveName] = useState('')
  const [snapshotName, setSnapshotName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)

  const registry = useMemo(() => REPORT_REGISTRY[selectedType], [selectedType])

  const executeReport = (
    entityType: ReportEntityType = selectedType,
    overrideFilters: ReportFilterValues = filters,
  ) => {
    setErrorMsg('')
    setStatusMsg('')
    startTransition(async () => {
      const res = await runReportAction({ entityType, filters: overrideFilters })
      if (res.status === 'success') {
        setResult(res.result)
      } else {
        setErrorMsg(res.message)
      }
    })
  }

  const handleSaveReport = () => {
    if (!saveName.trim()) return setErrorMsg('Enter a report name to save.')
    setErrorMsg('')
    startTransition(async () => {
      const res = await saveReportAction({
        name: saveName.trim(),
        entityType: selectedType,
        filters,
      })
      if (res.status === 'success') {
        setSavedReports((prev) => [res.savedReport, ...prev])
        setSaveName('')
        setStatusMsg('Saved report definition.')
      } else {
        setErrorMsg(res.message)
      }
    })
  }

  const handleCreateSnapshot = () => {
    if (!result) return
    const name = snapshotName.trim() || `${result.title} (${new Date().toLocaleDateString()})`
    startTransition(async () => {
      const res = await createReportSnapshotAction({
        name,
        result,
        filters,
      })
      if (res.status === 'success') {
        setSnapshotName('')
        setStatusMsg('Immutable report snapshot created.')
      } else {
        setErrorMsg(res.message)
      }
    })
  }

  const handleDownloadCsv = () => {
    if (!result) return
    const csv = buildCsvContent(result)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attainly-${result.entityType.toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadExcel = async () => {
    if (!result) return
    setErrorMsg('')
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: selectedType, filters }),
      })
      if (!res.ok) throw new Error('XLSX export failed.')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attainly-${result.entityType.toLowerCase()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback to SpreadsheetML if needed
      const xml = buildExcelXmlContent(result)
      const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attainly-${result.entityType.toLowerCase()}.xls`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleDownloadPdf = async () => {
    if (!result) return
    setIsPdfGenerating(true)
    try {
      const [{ pdf }, { ReportPdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/report-pdf-document'),
      ])
      const blob = await pdf(<ReportPdfDocument result={result} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attainly-${result.entityType.toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF export failed.')
    } finally {
      setIsPdfGenerating(false)
    }
  }

  const totalPages = result?.totalRows && result?.pageSize ? Math.max(1, Math.ceil(result.totalRows / result.pageSize)) : 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Report Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Deterministic, scope-enforced institutional reports with explicit counting units, activity-date filters, and immutable snapshots.
          </p>
        </div>
      </div>

      {/* Preset Selector & Filters */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="report-preset" className="text-xs font-medium text-foreground">
              Report Preset ({REPORT_PRESETS_LIST.length} available)
            </label>
            <select
              id="report-preset"
              value={selectedType}
              onChange={(e) => {
                const next = e.target.value as ReportEntityType
                setSelectedType(next)
                setFilters((f) => ({ ...f, page: 1, groupBy: undefined, selectedColumns: undefined }))
              }}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {['STUDENT', 'FACULTY', 'EVENT', 'GOVERNANCE'].map((cat) => (
                <optgroup key={cat} label={`${cat} REPORTS`}>
                  {REPORT_PRESETS_LIST.filter((p) => p.category === cat).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Unit:</strong> {registry.countingUnit} &middot;{' '}
              <strong className="text-foreground">Date:</strong> {registry.dateFieldSemantics}
            </p>
          </div>

          <div>
            <label htmlFor="rep-ay" className="text-xs font-medium text-foreground">Academic Year</label>
            <select
              id="rep-ay"
              value={filters.academicYearId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, academicYearId: e.target.value || undefined }))}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>{ay.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rep-dept" className="text-xs font-medium text-foreground">Department</label>
            <select
              id="rep-dept"
              value={filters.departmentId ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value || undefined }))}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-5">
          <div>
            <label htmlFor="rep-from" className="text-xs font-medium text-foreground">From Date</label>
            <input
              id="rep-from"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="rep-to" className="text-xs font-medium text-foreground">To Date</label>
            <input
              id="rep-to"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="rep-batch" className="text-xs font-medium text-foreground">Batch Year</label>
            <input
              id="rep-batch"
              type="number"
              placeholder="e.g. 2023"
              value={filters.batchYear ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, batchYear: e.target.value ? Number(e.target.value) : null }))}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="rep-verif" className="text-xs font-medium text-foreground">Verification Scope</label>
            <select
              id="rep-verif"
              value={filters.verificationStatus ?? 'VERIFIED'}
              onChange={(e) => {
                const v = e.target.value as ReportFilterValues['verificationStatus']
                setFilters((f) => ({ ...f, verificationStatus: v, includeUnverified: v === 'ALL' }))
              }}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="VERIFIED">Verified Only (Official)</option>
              <option value="ALL">All (Include Provisional/Pending)</option>
              <option value="PENDING">Pending Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>
          <div>
            <label htmlFor="rep-group" className="text-xs font-medium text-foreground">Group By</label>
            <select
              id="rep-group"
              value={filters.groupBy ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, groupBy: e.target.value || undefined }))}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Detailed Rows (No Grouping)</option>
              {registry.groupingDimensions.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Selectable Output Columns */}
        {!filters.groupBy && registry.columns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">Columns:</span>
            {registry.columns.map((c) => {
              const active = !filters.selectedColumns?.length || filters.selectedColumns.includes(c.key)
              return (
                <label key={c.key} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => {
                      const current = filters.selectedColumns?.length
                        ? filters.selectedColumns
                        : registry.columns.map((col) => col.key)
                      const next = e.target.checked
                        ? [...new Set([...current, c.key])]
                        : current.filter((k) => k !== c.key)
                      setFilters((f) => ({ ...f, selectedColumns: next.length ? next : undefined }))
                    }}
                  />
                  {c.label}
                </label>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => executeReport(selectedType, { ...filters, page: 1 })}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Run Report
            </button>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Save report name…"
              className="rounded-xl border border-input bg-background px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={handleSaveReport}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
            >
              <Save size={13} />
              Save Definition
            </button>
          </div>
          {errorMsg && <span className="text-xs font-medium text-destructive">{errorMsg}</span>}
          {statusMsg && <span className="text-xs font-medium text-primary">{statusMsg}</span>}
        </div>
      </section>

      {/* Report Results */}
      {result && (
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{result.title}</h2>
                {result.verificationScope?.includes('provisional') && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <ShieldAlert size={12} />
                    Includes Provisional / Unverified
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {result.institutionName} &middot; {result.countingUnit} &middot; {result.verificationScope} &middot; Generated {new Date(result.generatedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Download size={13} />
                CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <FileSpreadsheet size={13} />
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                <FileText size={13} />
                {isPdfGenerating ? 'PDF…' : 'PDF'}
              </button>
              <div className="flex items-center gap-1">
                <input
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="Snapshot name…"
                  className="w-36 rounded-xl border border-input bg-background px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Camera size={13} />
                  Snapshot
                </button>
              </div>
            </div>
          </div>

          {result.summaryMetrics && result.summaryMetrics.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-4">
              {result.summaryMetrics.map((m) => (
                <div key={m.label} className="rounded-xl border border-border bg-background p-3.5">
                  <p className="text-[11px] font-medium text-muted-foreground">{m.label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          )}

          {result.rows.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                      {result.columns.map((c) => (
                        <th key={c.key} className="pb-2.5 pr-4">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/40">
                        {result.columns.map((c) => (
                          <td key={c.key} className="py-2.5 pr-4 text-foreground">
                            {String(row[c.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>
                  Showing page {result.page ?? 1} of {totalPages} ({result.totalRows ?? result.rows.length} total rows)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={(result.page ?? 1) <= 1 || isPending}
                    onClick={() => {
                      const next = Math.max(1, (result.page ?? 1) - 1)
                      setFilters((f) => ({ ...f, page: next }))
                      executeReport(selectedType, { ...filters, page: next })
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <button
                    type="button"
                    disabled={(result.page ?? 1) >= totalPages || isPending}
                    onClick={() => {
                      const next = Math.min(totalPages, (result.page ?? 1) + 1)
                      setFilters((f) => ({ ...f, page: next }))
                      executeReport(selectedType, { ...filters, page: next })
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
              No records match the selected filters.
            </p>
          )}
        </section>
      )}

      {/* Saved Reports & Immutable Snapshots */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Saved Report Definitions ({savedReports.length})</h3>
          <div className="mt-3 space-y-2">
            {savedReports.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved definitions yet.</p>
            ) : (
              savedReports.map((sr) => (
                <div key={sr.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{sr.name}</p>
                    <p className="text-[11px] text-muted-foreground">{sr.entityType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const et = sr.entityType as ReportEntityType
                        const f = (sr.filters ?? {}) as ReportFilterValues
                        setSelectedType(et)
                        setFilters(f)
                        executeReport(et, f)
                      }}
                      className="rounded-lg bg-primary/10 px-2.5 py-1 font-semibold text-primary"
                    >
                      Run
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteSavedReportAction(sr.id)
                          setSavedReports((prev) => prev.filter((x) => x.id !== sr.id))
                        })
                      }
                      className="rounded-lg p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Immutable Report Snapshots ({snapshots.length})</h3>
          <div className="mt-3 space-y-2">
            {snapshots.length === 0 ? (
              <p className="text-xs text-muted-foreground">No snapshots captured yet.</p>
            ) : (
              snapshots.map((snap) => (
                <div key={snap.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{snap.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {snap.rowCount} rows &middot; {snap.verificationScope} &middot; {new Date(snap.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResult(snap.payload as unknown as ReportTableResult)}
                    className="rounded-lg bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground"
                  >
                    View Snapshot
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
