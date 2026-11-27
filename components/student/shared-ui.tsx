'use client'

import { useState, type ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileUp,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { StudentActionState } from '@/app/actions/student'
import {
  DocumentPreviewDrawer,
  ProgressBar,
  VerificationBadge as SharedVerificationBadge,
} from '@/components/shared/attainly-ui'

export const studentFieldClass =
  'mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20'

export const studentLabelClass =
  'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'

export const ACCREDITATION_CRITERIA = [
  { code: 'NAAC-1.3.2', label: 'NAAC 1.3.2: Value-Added Courses & Experiential Learning' },
  { code: 'NAAC-3.4.3', label: 'NAAC 3.4.3: Research Publications in UGC/Scopus Journals' },
  { code: 'NAAC-3.4.4', label: 'NAAC 3.4.4: Patents Published and Awarded' },
  { code: 'NAAC-5.2.1', label: 'NAAC 5.2.1: Placement & Internships of Students' },
  { code: 'NAAC-5.3.1', label: 'NAAC 5.3.1: Awards / Medals in Sports & Cultural Activities' },
  { code: 'NBA-PO-PSO', label: 'NBA PO/PSO: Program Outcomes & Attainment' },
]

export function ActionMessage({ state }: { state: StudentActionState }) {
  if (!state.message) return null
  const isError = state.status === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`mt-2.5 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        isError
          ? 'bg-[var(--status-rejected-bg)] text-[var(--status-rejected)]'
          : 'bg-[var(--status-verified-bg)] text-[var(--status-verified)]'
      }`}
    >
      {isError ? <AlertCircle size={14} className="shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />}
      <span>{state.message}</span>
    </div>
  )
}

export function VerificationBadge({
  status,
  rejectionReason,
  verifiedAt,
}: {
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED' | string
  rejectionReason?: string | null
  verifiedAt?: Date | string | null
}) {
  if (!status) return <SharedVerificationBadge status="PENDING" />
  if (status === 'VERIFIED') {
    return (
      <span
        title={verifiedAt ? `Verified on ${new Date(verifiedAt).toLocaleDateString()}` : 'Verified'}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--status-verified-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--status-verified)]"
      >
        <CheckCircle2 size={11} aria-hidden="true" /> Verified
      </span>
    )
  }
  if (status === 'REJECTED') {
    return (
      <span
        title={rejectionReason ?? 'Needs changes'}
        className="inline-flex items-center gap-1 rounded-full bg-[var(--status-rejected-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--status-rejected)]"
      >
        <AlertCircle size={11} aria-hidden="true" /> Needs changes
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-pending-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--status-pending)]">
      <Clock size={11} aria-hidden="true" /> Pending review
    </span>
  )
}

export function ReviewerFeedbackBanner({
  status,
  rejectionReason,
}: {
  status?: string
  rejectionReason?: string | null
}) {
  if (status !== 'REJECTED' || !rejectionReason) return null
  return (
    <div
      role="alert"
      className="mt-2.5 flex items-start gap-2 rounded-lg border border-destructive/25 bg-[var(--status-rejected-bg)] px-3 py-2 text-xs text-[var(--status-rejected)]"
    >
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <div>
        <strong>Reviewer feedback:</strong> {rejectionReason}
      </div>
    </div>
  )
}

export function DocumentPreviewLink({
  fileUrl,
  label = 'Preview document',
}: {
  fileUrl?: string | null
  label?: string
}) {
  const [open, setOpen] = useState(false)
  if (!fileUrl) return null
  const href = fileUrl.startsWith('http')
    ? fileUrl
    : `/api/documents?pathname=${encodeURIComponent(fileUrl)}&disposition=inline`
  const lower = fileUrl.toLowerCase()
  const mimeType = lower.endsWith('.png')
    ? 'image/png'
    : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
      ? 'image/jpeg'
      : 'application/pdf'

  return (
    <>
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <Eye size={13} aria-hidden="true" /> {label}
        </button>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title="Open in new tab"
          aria-label={`Open ${label} in new tab`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </span>
      <DocumentPreviewDrawer
        open={open}
        title={label}
        documentUrl={href}
        mimeType={mimeType}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

export function SingleDocumentUploadField({
  id,
  name,
  label = 'Supporting Document (PDF / PNG / JPG)',
  defaultValue = '',
}: {
  id: string
  name: string
  label?: string
  defaultValue?: string
}) {
  const [fileUrl, setFileUrl] = useState(defaultValue)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setProgress(25)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      setProgress(80)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setFileUrl(data.fileUrl)
      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label htmlFor={id} className={studentLabelClass}>
        {label}
      </label>
      <input type="hidden" name={name} value={fileUrl} />
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted focus-within:ring-2 focus-within:ring-ring"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          {uploading ? 'Uploading…' : fileUrl ? 'Replace file' : 'Choose file'}
        </label>
        <input
          id={id}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleUpload}
          className="sr-only"
        />
        {fileUrl && <DocumentPreviewLink fileUrl={fileUrl} label="Preview uploaded file" />}
        {fileUrl && (
          <button
            type="button"
            onClick={() => {
              setFileUrl('')
              setProgress(0)
            }}
            className="text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>
      {uploading && (
        <div className="mt-2 max-w-xs">
          <ProgressBar value={progress} label="Uploading evidence…" />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--status-rejected)]">
          {error}
        </p>
      )}
    </div>
  )
}

export function MultiDocumentUploadField({
  id,
  name = 'documentUrls',
  label = 'Supporting Documents (multiple allowed)',
  defaultUrls = [],
}: {
  id: string
  name?: string
  label?: string
  defaultUrls?: string[]
}) {
  const [urls, setUrls] = useState<string[]>(defaultUrls)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const uploaded: string[] = []
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/documents', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Failed to upload ${file.name}`)
        uploaded.push(data.fileUrl)
      }
      setUrls((prev) => [...prev, ...uploaded])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label htmlFor={id} className={studentLabelClass}>
        {label}
      </label>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
          {uploading ? 'Uploading…' : 'Attach files'}
        </label>
        <input
          id={id}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleUpload}
          className="sr-only"
        />
      </div>
      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {urls.map((u, idx) => (
            <span
              key={u}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs"
            >
              <DocumentPreviewLink fileUrl={u} label={`Document ${idx + 1}`} />
              <button
                type="button"
                aria-label={`Remove document ${idx + 1}`}
                onClick={() => setUrls((prev) => prev.filter((item) => item !== u))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--status-rejected)]">
          {error}
        </p>
      )}
    </div>
  )
}

export function ConfirmDeleteForm({
  id,
  action,
  itemLabel = 'record',
}: {
  id: string
  action: (formData: FormData) => void
  itemLabel?: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2 size={12} aria-hidden="true" /> Delete
      </button>
    )
  }

  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Confirm delete ${itemLabel}`}
        className="rounded-lg bg-destructive px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
      >
        Cancel
      </button>
    </form>
  )
}

export function StudentSectionHeader({
  title,
  description,
  badge,
  action,
}: {
  title: string
  description: string
  badge?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

/**
 * Collapsible form container so add forms do not permanently clutter the top of every list,
 * while remaining 1-click accessible on both desktop and mobile.
 */
export function CollapsibleFormCard({
  title,
  buttonLabel,
  defaultOpen = false,
  children,
}: {
  title: string
  buttonLabel: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-6 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? <X size={13} /> : <Plus size={13} />}
          {open ? 'Close' : buttonLabel}
        </button>
      </div>
      {open && <div className="border-t border-border p-4 sm:p-5">{children}</div>}
    </div>
  )
}
