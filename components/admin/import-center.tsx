'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Upload,
  XCircle,
} from 'lucide-react'
import {
  IMPORT_CATALOG,
  IMPORT_TYPE_KEYS,
  type ImportTypeKey,
} from '@/lib/import-types'

export interface ImportJobSummaryItem {
  id: string
  importType: string
  fileName: string
  fileFormat: string
  conflictMode: string
  trustProvenance: string
  status: string
  totalRows: number
  validRows: number
  invalidRows: number
  processedRows: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  errorMessage: string | null
  createdAt: string | Date
  completedAt: string | Date | null
  rolledBackAt: string | Date | null
}

interface StagedPreviewState {
  jobId: string
  importType: ImportTypeKey
  fileName: string
  fileFormat: 'CSV' | 'XLSX'
  headers: string[]
  columnMapping: Record<string, string>
  totalRows: number
  validRows: number
  invalidRows: number
  previewSummary: {
    willCreate: number
    willUpdate: number
    willSkip: number
    invalid: number
  }
  previewRows: Array<{
    rowNumber: number
    status: string
    actionPreview: 'CREATE' | 'UPDATE' | 'SKIP' | 'INVALID'
    matchKey: string | null
    errorMessage: string | null
    rawPayload: Record<string, string>
  }>
  duplicateFileWarning?: string
}

interface ImportCenterProps {
  initialJobs: ImportJobSummaryItem[]
  isInstitutionWideAdmin: boolean
  canVerify: boolean
  assignedDepartments: Array<{ id: string; code: string; name: string }>
}

const STATUS_BADGE: Record<string, string> = {
  VALIDATED: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  QUEUED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  PROCESSING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  PARTIALLY_FAILED: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  FAILED: 'bg-destructive/10 text-destructive border-destructive/20',
  ROLLED_BACK: 'bg-muted text-muted-foreground border-border',
}

export function ImportCenter({
  initialJobs,
  isInstitutionWideAdmin,
  canVerify,
  assignedDepartments,
}: ImportCenterProps) {
  const [selectedType, setSelectedType] = useState<ImportTypeKey>('STUDENT_IDENTITY')
  const [conflictMode, setConflictMode] = useState<'SKIP_EXISTING' | 'UPDATE_EXISTING' | 'CREATE_ONLY'>('SKIP_EXISTING')
  const [trustedProvenance, setTrustedProvenance] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [staged, setStaged] = useState<StagedPreviewState | null>(null)
  const [activeJob, setActiveJob] = useState<ImportJobSummaryItem | null>(null)
  const [jobs, setJobs] = useState<ImportJobSummaryItem[]>(initialJobs)
  const [staging, setStaging] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSchemaGuide, setShowSchemaGuide] = useState(false)

  const definition = IMPORT_CATALOG[selectedType]
  const typeDisabledForScope = !isInstitutionWideAdmin && definition.adminOnly

  const groupedTypes = useMemo(() => {
    const groups: Record<string, ImportTypeKey[]> = {
      Identities: [],
      'Student Records': [],
      'Faculty Records': [],
      'Research & Outreach': [],
    }
    for (const key of IMPORT_TYPE_KEYS) {
      groups[IMPORT_CATALOG[key].category].push(key)
    }
    return groups
  }, [])

  // Poll active background job if QUEUED or PROCESSING
  useEffect(() => {
    if (!activeJob || (activeJob.status !== 'QUEUED' && activeJob.status !== 'PROCESSING')) {
      return
    }
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/imports/${activeJob.id}`)
        if (!res.ok) return
        const data = (await res.json()) as { job: ImportJobSummaryItem }
        setActiveJob(data.job)
        setJobs((prev) => prev.map((j) => (j.id === data.job.id ? data.job : j)))
        if (data.job.status === 'QUEUED') {
          await fetch(`/api/imports/worker?jobId=${data.job.id}`, { method: 'POST' })
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 2000)
    return () => clearInterval(timer)
  }, [activeJob])

  const handleTypeChange = (nextType: ImportTypeKey) => {
    setSelectedType(nextType)
    setTrustedProvenance(false)
    setStaged(null)
    setColumnMapping({})
    setError(null)
  }

  const runDryRun = async (overrideMapping?: Record<string, string>) => {
    if (!selectedFile) {
      setError('Please choose a CSV or XLSX file first.')
      return
    }
    setError(null)
    setStaging(true)
    setActiveJob(null)
    try {
      const fd = new FormData()
      fd.set('file', selectedFile)
      fd.set('importType', selectedType)
      fd.set('conflictMode', conflictMode)
      fd.set('trustedProvenance', String(trustedProvenance && definition.supportsTrustedProvenance && canVerify))
      if (overrideMapping && Object.keys(overrideMapping).length > 0) {
        fd.set('columnMapping', JSON.stringify(overrideMapping))
      }

      const res = await fetch('/api/imports/stage', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Dry-run validation failed.')
      }
      setStaged(data as StagedPreviewState)
      setColumnMapping((data as StagedPreviewState).columnMapping)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dry-run validation failed.')
    } finally {
      setStaging(false)
    }
  }

  const handleConfirmExecute = async () => {
    if (!staged) return
    setError(null)
    setExecuting(true)
    try {
      const res = await fetch(`/api/imports/${staged.jobId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Import execution failed.')
      }
      const job = data.job as ImportJobSummaryItem
      setActiveJob(job)
      setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)])
      setStaged(null)

      if (job.status === 'QUEUED') {
        fetch(`/api/imports/worker?jobId=${job.id}`, { method: 'POST' }).catch(() => {})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import execution failed.')
    } finally {
      setExecuting(false)
    }
  }

  const handleRollback = async (jobId: string) => {
    setError(null)
    setRollingBackId(jobId)
    try {
      const res = await fetch(`/api/imports/${jobId}/rollback`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Rollback failed.')
      }
      const updated = data.job as ImportJobSummaryItem
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
      if (activeJob?.id === updated.id) setActiveJob(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollback failed.')
    } finally {
      setRollingBackId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Institutional Data Migration
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bulk Import Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Validate, map, preview, and import CSV or native XLSX institutional records with duplicate protection and audit trails.
          </p>
        </div>
        {!isInstitutionWideAdmin && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-700 dark:text-amber-300">
            <strong>Department Coordinator Scope:</strong>{' '}
            {assignedDepartments.length > 0
              ? assignedDepartments.map((d) => d.code).join(', ')
              : 'No departments assigned'}
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Import Type & Configuration */}
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-5">
          <div>
            <label htmlFor="importTypeSelect" className="text-sm font-semibold text-foreground">
              1. Select Import Dataset
            </label>
            <select
              id="importTypeSelect"
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value as ImportTypeKey)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(groupedTypes).map(([category, keys]) => (
                <optgroup key={category} label={category}>
                  {keys.map((k) => {
                    const item = IMPORT_CATALOG[k]
                    const locked = !isInstitutionWideAdmin && item.adminOnly
                    return (
                      <option key={k} value={k} disabled={locked}>
                        {item.label}{locked ? ' (Admin only)' : ''}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">{definition.description}</p>
            <p className="mt-1.5 text-xs text-foreground">
              <span className="font-semibold">Matching rule:</span> {definition.matchKeyDescription}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">2. Download Template</span>
              <button
                type="button"
                onClick={() => setShowSchemaGuide((v) => !v)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {showSchemaGuide ? 'Hide field guide' : `View ${definition.columns.length} columns`}
              </button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <a
                href={`/api/imports/templates/${selectedType}?format=xlsx`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>XLSX Template (+ Guide)</span>
              </a>
              <a
                href={`/api/imports/templates/${selectedType}?format=csv`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-muted"
              >
                <Download size={14} />
                <span>CSV Template</span>
              </a>
            </div>
            {showSchemaGuide && (
              <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-border bg-background p-2.5 text-[11px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-1 pr-2">Column</th>
                      <th className="py-1 pr-2">Req</th>
                      <th className="py-1">Rule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {definition.columns.map((c) => (
                      <tr key={c.key} className="border-b border-border/50 last:border-0">
                        <td className="py-1 pr-2 font-mono font-semibold text-foreground">{c.key}</td>
                        <td className="py-1 pr-2">{c.required ? 'Yes' : 'No'}</td>
                        <td className="py-1 text-muted-foreground">
                          {c.enumValues ? c.enumValues.join(' | ') : c.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="importFileInput" className="text-sm font-semibold text-foreground">
                3. Upload CSV or XLSX File
              </label>
              <input
                id="importFileInput"
                type="file"
                accept=".csv,.xlsx,.xlsm"
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] ?? null)
                  setStaged(null)
                  setColumnMapping({})
                  setError(null)
                }}
                className="mt-2 block w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
              />
            </div>

            <div>
              <label htmlFor="conflictModeSelect" className="text-xs font-semibold text-foreground">
                Existing Record Policy
              </label>
              <select
                id="conflictModeSelect"
                value={conflictMode}
                onChange={(e) => setConflictMode(e.target.value as typeof conflictMode)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="SKIP_EXISTING">Skip existing matched records (Safe default)</option>
                <option value="UPDATE_EXISTING">Update existing unverified records (Protects VERIFIED)</option>
                <option value="CREATE_ONLY">Create only (Fail if match exists)</option>
              </select>
            </div>

            {definition.supportsTrustedProvenance && canVerify && isInstitutionWideAdmin && (
              <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <input
                  type="checkbox"
                  checked={trustedProvenance}
                  onChange={(e) => setTrustedProvenance(e.target.checked)}
                  className="mt-0.5 rounded border-input"
                />
                <span>
                  <strong className="text-foreground">Mark imported records as VERIFIED</strong>
                  <span className="block text-muted-foreground">
                    Only check for official institutional records. Unchecked imports start as PENDING review.
                  </span>
                </span>
              </label>
            )}
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <XCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={staging || !selectedFile || typeDisabledForScope}
            onClick={() => runDryRun()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {staging ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span>{staging ? 'Validating & Analyzing…' : 'Validate & Preview Import'}</span>
          </button>
        </section>

        {/* Right: Mapping, Dry-Run Preview & Execution */}
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
          {!staged && !activeJob && (
            <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
              <FileSpreadsheet size={36} className="text-muted-foreground/60" />
              <h2 className="mt-3 text-base font-semibold text-foreground">
                Dry-Run Preview & Column Mapping
              </h2>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Upload a CSV or XLSX spreadsheet and click <strong>Validate & Preview Import</strong>. No database records are modified until you review the validation results and confirm.
              </p>
            </div>
          )}

          {staged && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    Dry-Run Preview — {staged.fileName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {staged.totalRows} total rows · {staged.fileFormat} format
                  </p>
                </div>
                <button
                  type="button"
                  disabled={staging}
                  onClick={() => runDryRun(columnMapping)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <RefreshCw size={13} />
                  <span>Re-validate Mapping</span>
                </button>
              </div>

              {staged.duplicateFileWarning && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>{staged.duplicateFileWarning}</span>
                </div>
              )}

              {/* Summary KPI strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Will Create</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-600">{staged.previewSummary.willCreate}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Will Update</p>
                  <p className="mt-0.5 text-xl font-bold text-sky-600">{staged.previewSummary.willUpdate}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Will Skip</p>
                  <p className="mt-0.5 text-xl font-bold text-muted-foreground">{staged.previewSummary.willSkip}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Invalid Rows</p>
                  <p className="mt-0.5 text-xl font-bold text-destructive">{staged.previewSummary.invalid}</p>
                </div>
              </div>

              {/* Column Mapping */}
              <details className="rounded-xl border border-border bg-muted/20 p-3">
                <summary className="cursor-pointer text-xs font-semibold text-foreground">
                  Column Mapping ({Object.keys(columnMapping).length} of {definition.columns.length} fields mapped)
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {definition.columns.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-foreground">
                        {col.label}
                        {col.required && <span className="text-destructive"> *</span>}
                      </span>
                      <select
                        aria-label={`Map ${col.label}`}
                        value={columnMapping[col.key] ?? ''}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({ ...prev, [col.key]: e.target.value }))
                        }
                        className="w-40 rounded-lg border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="">— Unmapped —</option>
                        {staged.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </details>

              {/* Preview Table */}
              <div className="max-h-72 overflow-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted/90 text-muted-foreground backdrop-blur">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Match Key</th>
                      <th className="px-3 py-2">Validation / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staged.previewRows.map((r) => (
                      <tr key={r.rowNumber} className="bg-background">
                        <td className="px-3 py-2 font-mono">{r.rowNumber}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              r.actionPreview === 'INVALID'
                                ? STATUS_BADGE.FAILED
                                : r.actionPreview === 'CREATE'
                                  ? STATUS_BADGE.COMPLETED
                                  : r.actionPreview === 'UPDATE'
                                    ? STATUS_BADGE.VALIDATED
                                    : STATUS_BADGE.ROLLED_BACK
                            }`}
                          >
                            {r.actionPreview}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {r.matchKey ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.errorMessage ? (
                            <span className="text-destructive">{r.errorMessage}</span>
                          ) : (
                            'Ready'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {staged.invalidRows > 0 ? (
                  <a
                    href={`/api/imports/${staged.jobId}/errors`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <Download size={14} />
                    <span>Download Validation Errors ({staged.invalidRows})</span>
                  </a>
                ) : (
                  <span className="text-xs text-emerald-600 font-medium">
                    All {staged.validRows} rows passed validation.
                  </span>
                )}

                <button
                  type="button"
                  disabled={executing || staged.validRows === 0}
                  onClick={handleConfirmExecute}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {executing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>
                    {executing
                      ? 'Importing…'
                      : `Confirm & Import ${staged.validRows} Valid Row${staged.validRows === 1 ? '' : 's'}`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeJob && (
            <div className="space-y-4 rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Import Job Summary — {activeJob.fileName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {IMPORT_CATALOG[activeJob.importType as ImportTypeKey]?.label ?? activeJob.importType}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_BADGE[activeJob.status] ?? STATUS_BADGE.QUEUED
                  }`}
                >
                  {activeJob.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">Created</p>
                  <p className="text-lg font-bold text-emerald-600">{activeJob.createdCount}</p>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">Updated</p>
                  <p className="text-lg font-bold text-sky-600">{activeJob.updatedCount}</p>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">Skipped</p>
                  <p className="text-lg font-bold text-muted-foreground">{activeJob.skippedCount}</p>
                </div>
                <div className="rounded-lg border border-border p-2.5">
                  <p className="text-[11px] text-muted-foreground">Failed</p>
                  <p className="text-lg font-bold text-destructive">{activeJob.failedCount}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeJob.failedCount > 0 && (
                  <a
                    href={`/api/imports/${activeJob.id}/errors`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    <Download size={13} />
                    <span>Download Error Report</span>
                  </a>
                )}
                {(activeJob.status === 'COMPLETED' || activeJob.status === 'PARTIALLY_FAILED') &&
                  activeJob.createdCount > 0 && (
                    <button
                      type="button"
                      disabled={rollingBackId === activeJob.id}
                      onClick={() => handleRollback(activeJob.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20"
                    >
                      <RotateCcw size={13} />
                      <span>
                        {rollingBackId === activeJob.id ? 'Rolling back…' : 'Rollback Created Records'}
                      </span>
                    </button>
                  )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Recent Import Jobs */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Import History & Audit Log</h2>
            <p className="text-xs text-muted-foreground">
              Track batch progress, download row-level error reports, or roll back newly created records.
            </p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">No bulk import jobs recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5">Dataset</th>
                  <th className="px-3 py-2.5">File</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Created / Updated / Skipped / Failed</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((job) => (
                  <tr key={job.id} className="bg-background">
                    <td className="px-3 py-2.5 font-medium text-foreground">
                      {IMPORT_CATALOG[job.importType as ImportTypeKey]?.label ?? job.importType}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {job.fileName} ({job.fileFormat})
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          STATUS_BADGE[job.status] ?? STATUS_BADGE.QUEUED
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <span className="text-emerald-600">{job.createdCount}</span> /{' '}
                      <span className="text-sky-600">{job.updatedCount}</span> /{' '}
                      <span className="text-muted-foreground">{job.skippedCount}</span> /{' '}
                      <span className="text-destructive">{job.failedCount}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {job.failedCount > 0 && (
                          <a
                            href={`/api/imports/${job.id}/errors`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                          >
                            <Download size={12} />
                            <span>Errors</span>
                          </a>
                        )}
                        {(job.status === 'COMPLETED' || job.status === 'PARTIALLY_FAILED') &&
                          job.createdCount > 0 && (
                            <button
                              type="button"
                              disabled={rollingBackId === job.id}
                              onClick={() => handleRollback(job.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10"
                            >
                              <RotateCcw size={12} />
                              <span>Rollback</span>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
