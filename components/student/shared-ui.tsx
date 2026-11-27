'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, Eye, FileUp, Loader2, Trash2, X } from 'lucide-react'
import type { StudentActionState } from '@/app/actions/student'

export const studentFieldClass =
  'mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20'

export const studentLabelClass = 'text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300'

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
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`mt-2 text-xs font-medium ${
        state.status === 'error' ? 'text-destructive' : 'text-teal-600 dark:text-teal-400'
      }`}
    >
      {state.message}
    </p>
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
  if (status === 'VERIFIED') {
    return (
      <span
        title={verifiedAt ? `Verified on ${new Date(verifiedAt).toLocaleDateString()}` : 'Verified'}
        className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300"
      >
        <CheckCircle2 size={12} /> Verified
      </span>
    )
  }
  if (status === 'REJECTED') {
    return (
      <span
        title={rejectionReason ?? 'Needs changes'}
        className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive"
      >
        <AlertCircle size={12} /> Needs changes
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
      <Clock size={12} /> Pending review
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
    <div className="mt-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <strong>Reviewer feedback:</strong> {rejectionReason}
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
  if (!fileUrl) return null
  const href = fileUrl.startsWith('http')
    ? fileUrl
    : `/api/documents?pathname=${encodeURIComponent(fileUrl)}&disposition=inline`
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
    >
      <Eye size={13} /> {label}
    </a>
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
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          <FileUp size={14} /> {uploading ? 'Uploading…' : 'Choose file'}
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
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>
      {uploading && (
        <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
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
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
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
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
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
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10"
      >
        <Trash2 size={12} /> Delete
      </button>
    )
  }

  return (
    <form action={action} className="inline-flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Confirm delete ${itemLabel}`}
        className="rounded-lg bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground hover:opacity-90"
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
}: {
  title: string
  description: string
  badge?: string
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {badge && (
        <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          {badge}
        </span>
      )}
    </div>
  )
}
