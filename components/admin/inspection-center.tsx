'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  createDataCollectionRequestsAction,
  createInspectionCollectionAction,
  deleteInspectionCollectionAction,
  reviewDataRequestAction,
  sendDataRequestReminderAction,
  type InspectionActionState,
} from '@/app/actions/inspections'
import { REPORT_PRESETS_LIST } from '@/lib/reporting-registry'
import { Bell, CheckCircle2, Download, ExternalLink, FileArchive, Loader2, Plus, Send, Trash2, XCircle } from 'lucide-react'

const initialState: InspectionActionState = { status: 'idle', message: '' }

export interface ExportJobSummary {
  id: string
  collectionId: string | null
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string
  totalItems: number
  processedItems: number
  includedFiles: number
  missingFiles: number
  failedFiles: number
  outputSizeBytes: number | null
  outputFilename: string | null
  errorMessage: string | null
  expiresAt: Date | string | null
  createdAt: Date | string
  completedAt: Date | string | null
  collection?: { title: string; framework: string } | null
}

export function InspectionCenterClient({
  collections,
  initialExportJobs = [],
  dataRequests,
  departments,
  academicYears,
  users,
  documents,
}: {
  collections: Array<{
    id: string
    framework: string
    title: string
    description: string | null
    reportIds: string[]
    documentIds: string[]
    includeUnverified: boolean
    status: string
    lastExportedAt: Date | string | null
    createdAt: Date | string
  }>
  initialExportJobs?: ExportJobSummary[]
  dataRequests: Array<{
    id: string
    title: string
    targetType: string
    status: string
    dueDate: Date | string | null
    isOverdue?: boolean
    requireEvidence?: boolean
    reminderCount: number
    targetUserName: string
    targetUserEmail: string
    targetUserRole: string
    responseNote: string | null
    linkedDocumentId?: string | null
    linkedDocumentFilename?: string | null
    linkedEntityType?: string | null
    linkedEntityId?: string | null
  }>
  departments: Array<{ id: string; code: string; name: string }>
  academicYears: Array<{ id: string; label: string }>
  users: Array<{ id: string; firstName: string; lastName: string; email: string; role: { key: string } }>
  documents: Array<{ id: string; originalFilename: string; ownerName: string }>
}) {
  const [tab, setTab] = useState<'collections' | 'requests'>('collections')
  const [exportJobs, setExportJobs] = useState<ExportJobSummary[]>(initialExportJobs)
  const [exportNotice, setExportNotice] = useState<string | null>(null)
  const [enqueueingId, setEnqueueingId] = useState<string | null>(null)
  const [colState, colAction, colPending] = useActionState(createInspectionCollectionAction, initialState)
  const [delState, delAction, delPending] = useActionState(deleteInspectionCollectionAction, initialState)
  const [reqState, reqAction, reqPending] = useActionState(createDataCollectionRequestsAction, initialState)
  const [remState, remAction, remPending] = useActionState(sendDataRequestReminderAction, initialState)
  const [revState, revAction, revPending] = useActionState(reviewDataRequestAction, initialState)

  const hasActiveJobs = exportJobs.some((j) => j.status === 'QUEUED' || j.status === 'PROCESSING')

  useEffect(() => {
    if (!hasActiveJobs) return
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/exports', { cache: 'no-store' })
        if (res.ok) {
          const data = (await res.json()) as { jobs?: ExportJobSummary[] }
          if (data.jobs) setExportJobs(data.jobs)
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 2500)
    return () => clearInterval(timer)
  }, [hasActiveJobs])

  async function queueBackgroundExport(collectionId: string) {
    setEnqueueingId(collectionId)
    setExportNotice(null)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      })
      const data = (await res.json()) as { job?: ExportJobSummary; error?: string }
      if (!res.ok || !data.job) {
        setExportNotice(data.error ?? 'Failed to queue background export.')
        return
      }
      setExportJobs((prev) => [data.job!, ...prev])
      setExportNotice(`Queued export job ${data.job.id.slice(-8)}. You can keep using Attainly while it builds.`)
      // Trigger dedicated worker endpoint in background
      fetch(`/api/exports/worker?jobId=${encodeURIComponent(data.job.id)}`, { method: 'POST' }).catch(() => {})
    } finally {
      setEnqueueingId(null)
    }
  }

  async function cancelJob(jobId: string) {
    const res = await fetch(`/api/exports/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' })
    if (res.ok) {
      const data = (await res.json()) as { job?: ExportJobSummary }
      if (data.job) {
        setExportJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...data.job } : j)))
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inspection Center &amp; Data Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assemble configurable evidence packages (NAAC, NBA, AICTE, Custom) and manage data collection requests.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-2xl border border-border bg-card p-1.5">
          <button
            type="button"
            onClick={() => setTab('collections')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'collections' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Inspection Packages ({collections.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'requests' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            Data Collection Requests ({dataRequests.length})
          </button>
        </div>
      </div>

      {tab === 'collections' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-base font-semibold">Create Inspection Evidence Collection</h2>
            <p className="text-xs text-muted-foreground">
              Select reports, academic years, departments, and supporting evidence to export as a structured ZIP package with manifest.
            </p>
            <form action={colAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="insp-fw" className="text-xs font-medium">Framework</label>
                  <select id="insp-fw" name="framework" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                    <option value="NAAC">NAAC</option>
                    <option value="NBA">NBA</option>
                    <option value="AICTE">AICTE</option>
                    <option value="CUSTOM">Custom Inspection</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="insp-title" className="text-xs font-medium">Collection Title *</label>
                  <input id="insp-title" name="title" required placeholder="e.g. AQAR 2025-26 Criterion 3 & 5 Evidence" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="insp-ays" className="text-xs font-medium">Academic Years (Ctrl+Click)</label>
                  <select id="insp-ays" name="academicYearIds" multiple size={4} className="mt-1.5 w-full rounded-xl border border-input bg-background p-2 text-xs">
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>{ay.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="insp-depts" className="text-xs font-medium">Departments (Ctrl+Click)</label>
                  <select id="insp-depts" name="departmentIds" multiple size={4} className="mt-1.5 w-full rounded-xl border border-input bg-background p-2 text-xs">
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="insp-reports" className="text-xs font-medium">Include Reports *</label>
                  <select id="insp-reports" name="reportIds" multiple size={4} className="mt-1.5 w-full rounded-xl border border-input bg-background p-2 text-xs">
                    {REPORT_PRESETS_LIST.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="insp-docs" className="text-xs font-medium">Include Specific Documents (optional, blank = latest 100)</label>
                <select id="insp-docs" name="documentIds" multiple size={4} className="mt-1.5 w-full rounded-xl border border-input bg-background p-2 text-xs">
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>{d.originalFilename} — {d.ownerName}</option>
                  ))}
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" name="includeUnverified" />
                Include unverified/provisional records (off by default)
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={colPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <Plus size={14} />
                  {colPending ? 'Creating…' : 'Create Collection'}
                </button>
                {colState.message && (
                  <span className={`text-xs ${colState.status === 'error' ? 'text-destructive' : 'text-primary'}`}>
                    {colState.message}
                  </span>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-semibold">Configured Collections</h2>
            {delState.message && <p className="text-xs text-primary">{delState.message}</p>}
            {collections.length === 0 ? (
              <p className="text-xs text-muted-foreground">No inspection collections created yet.</p>
            ) : (
              <div className="space-y-3">
                {collections.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                          {c.framework}
                        </span>
                        <span className="font-semibold text-sm text-foreground">{c.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.reportIds.length || 3} reports &middot;{' '}
                        {c.includeUnverified ? 'Includes provisional' : 'Verified baseline only'}
                        {c.lastExportedAt ? ` • Last exported ${new Date(c.lastExportedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => queueBackgroundExport(c.id)}
                        disabled={enqueueingId === c.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {enqueueingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <FileArchive size={13} />}
                        Queue Background Export
                      </button>
                      <a
                        href={`/api/inspections/${c.id}/export`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Quick ZIP
                      </a>
                      <form action={delAction}>
                        <input type="hidden" name="collectionId" value={c.id} />
                        <button type="submit" disabled={delPending} className="rounded-xl border border-border p-2 text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Export Jobs &amp; Download History</h2>
              {hasActiveJobs && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Loader2 size={12} className="animate-spin" />
                  Processing in background…
                </span>
              )}
            </div>
            {exportNotice && <p className="text-xs text-primary">{exportNotice}</p>}
            {exportJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No background export jobs queued yet.</p>
            ) : (
              <div className="space-y-2.5">
                {exportJobs.map((job) => {
                  const pct = job.totalItems > 0 ? Math.min(100, Math.round((job.processedItems / job.totalItems) * 100)) : 0
                  const isExpired = job.expiresAt ? new Date(job.expiresAt).getTime() < Date.now() : false
                  return (
                    <div key={job.id} className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                            {job.status}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {job.collection?.title ?? job.outputFilename ?? `Export ${job.id.slice(-8)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {(job.status === 'QUEUED' || job.status === 'PROCESSING') && (
                            <button
                              type="button"
                              onClick={() => cancelJob(job.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-destructive hover:bg-muted"
                            >
                              <XCircle size={12} />
                              Cancel
                            </button>
                          )}
                          {job.status === 'COMPLETED' && !isExpired && (
                            <a
                              href={`/api/exports/${job.id}/download`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                            >
                              <Download size={12} />
                              Download ZIP ({job.outputSizeBytes ? `${(job.outputSizeBytes / 1024).toFixed(1)} KB` : 'ready'})
                            </a>
                          )}
                          {job.status === 'COMPLETED' && isExpired && (
                            <span className="text-xs font-medium text-muted-foreground">Expired</span>
                          )}
                        </div>
                      </div>
                      {(job.status === 'QUEUED' || job.status === 'PROCESSING') && (
                        <div className="space-y-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {job.processedItems} / {job.totalItems} items ({pct}%)
                          </p>
                        </div>
                      )}
                      {job.status === 'COMPLETED' && (
                        <p className="text-[11px] text-muted-foreground">
                          Included: {job.includedFiles} &middot; Missing: {job.missingFiles} &middot; Failed: {job.failedFiles}
                          {job.expiresAt ? ` • Expires ${new Date(job.expiresAt).toLocaleString()}` : ''}
                        </p>
                      )}
                      {job.status === 'FAILED' && job.errorMessage && (
                        <p className="text-xs text-destructive">Error: {job.errorMessage}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-base font-semibold">Send Data Collection Request</h2>
            <form action={reqAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="req-title" className="text-xs font-medium">Request Title *</label>
                  <input id="req-title" name="title" required placeholder="e.g. Upload Internship Completion Certificate" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="req-type" className="text-xs font-medium">Target Record Type</label>
                  <select id="req-type" name="targetType" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm">
                    <option value="DOCUMENT">Supporting Document</option>
                    <option value="ACHIEVEMENT">Student Achievement</option>
                    <option value="CERTIFICATION">Certification</option>
                    <option value="FACULTY_FDP">Faculty FDP / Workshop</option>
                    <option value="FACULTY_RESEARCH">Faculty Research</option>
                    <option value="PROFILE">Profile Completion</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="req-users" className="text-xs font-medium">Recipients * (Ctrl+Click)</label>
                  <select id="req-users" name="targetUserIds" multiple size={5} required className="mt-1.5 w-full rounded-xl border border-input bg-background p-2 text-xs">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.role.key}) — {u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="req-due" className="text-xs font-medium">Deadline</label>
                    <input id="req-due" name="dueDate" type="date" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label htmlFor="req-desc" className="text-xs font-medium">Instructions</label>
                    <textarea id="req-desc" name="description" rows={2} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" name="requireEvidence" defaultChecked />
                  Require documentary evidence or linked profile record (recommended)
                </label>
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={reqPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                    <Send size={13} />
                    {reqPending ? 'Sending…' : 'Send Requests'}
                  </button>
                  {reqState.message && <span className="text-xs text-primary">{reqState.message}</span>}
                </div>
              </div>
            </form>
          </section>

          {/* Campaign Progress Summary */}
          <div className="grid gap-3 sm:grid-cols-5">
            {[
              { label: 'Total Requests', val: dataRequests.length },
              { label: 'Pending', val: dataRequests.filter((r) => r.status === 'PENDING').length },
              { label: 'Under Review', val: dataRequests.filter((r) => r.status === 'SUBMITTED').length },
              { label: 'Completed', val: dataRequests.filter((r) => r.status === 'COMPLETED').length },
              { label: 'Overdue', val: dataRequests.filter((r) => r.isOverdue).length },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-xl font-bold text-foreground">{s.val}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-base font-semibold">Assigned Requests Tracking</h2>
            {remState.message && <p className="text-xs text-primary">{remState.message}</p>}
            {revState.message && <p className="text-xs text-primary">{revState.message}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2.5 pr-4">Request &amp; Evidence</th>
                    <th className="pb-2.5 pr-4">Recipient</th>
                    <th className="pb-2.5 pr-4">Type</th>
                    <th className="pb-2.5 pr-4">Due Date</th>
                    <th className="pb-2.5 pr-4">Status</th>
                    <th className="pb-2.5 pr-4">Reminders</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dataRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {r.title}
                        {r.responseNote && <div className="text-[11px] text-muted-foreground">Note: {r.responseNote}</div>}
                        {r.linkedDocumentId && (
                          <div className="mt-1">
                            <a
                              href={`/api/documents?id=${r.linkedDocumentId}&disposition=inline`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              <ExternalLink size={11} />
                              {r.linkedDocumentFilename ?? 'View Attached Document'}
                            </a>
                          </div>
                        )}
                        {r.linkedEntityType && r.linkedEntityId && (
                          <div className="text-[11px] text-muted-foreground">
                            Linked record: {r.linkedEntityType} ({r.linkedEntityId.slice(-6)})
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">{r.targetUserName} ({r.targetUserRole})</td>
                      <td className="py-2.5 pr-4">{r.targetType}</td>
                      <td className="py-2.5 pr-4">
                        {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
                        {r.isOverdue && <span className="ml-1 text-[10px] font-semibold text-destructive">(Overdue)</span>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-700'
                              : r.status === 'SUBMITTED'
                                ? 'bg-blue-500/15 text-blue-700'
                                : r.status === 'CORRECTION_REQUIRED'
                                  ? 'bg-destructive/15 text-destructive'
                                  : 'bg-amber-500/15 text-amber-700'
                          }`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">{r.reminderCount}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'SUBMITTED' && (
                            <>
                              <form action={revAction} className="inline">
                                <input type="hidden" name="requestId" value={r.id} />
                                <input type="hidden" name="status" value="COMPLETED" />
                                <button type="submit" disabled={revPending} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                                  <CheckCircle2 size={11} />
                                  Approve
                                </button>
                              </form>
                              <form action={revAction} className="inline">
                                <input type="hidden" name="requestId" value={r.id} />
                                <input type="hidden" name="status" value="CORRECTION_REQUIRED" />
                                <input type="hidden" name="reviewFeedback" value="Please upload clearer supporting evidence." />
                                <button type="submit" disabled={revPending} className="rounded-lg bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
                                  Return
                                </button>
                              </form>
                            </>
                          )}
                          {r.status !== 'COMPLETED' && (
                            <form action={remAction} className="inline">
                              <input type="hidden" name="requestId" value={r.id} />
                              <button type="submit" disabled={remPending} className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium">
                                <Bell size={11} />
                                Remind
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
