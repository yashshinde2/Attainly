'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  FileUp,
  FolderSearch,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { DocumentPreviewLink, studentLabelClass } from '@/components/student/shared-ui'
import { ProgressBar } from '@/components/shared/attainly-ui'

interface RecentDocumentItem {
  id: string
  pathname: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  version: number
  createdAt: string
}

interface DuplicateMatch {
  id: string
  pathname: string
  originalFilename: string
  version: number
}

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIMES = new Set(['application/pdf', 'image/png', 'image/jpeg'])

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function computeFileSha256(file: File): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null
    const buf = await file.arrayBuffer()
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

function validateFileClient(file: File): string | null {
  if (file.size < 1 || file.size > MAX_BYTES) {
    return 'File must be between 1 byte and 10 MB.'
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return 'Only PDF, PNG, and JPG/JPEG files are supported.'
  }
  return null
}

function uploadWithXhr(
  file: File,
  allowDuplicate: boolean,
  onProgress: (pct: number) => void,
  xhrRef: { current: XMLHttpRequest | null },
): Promise<{
  fileUrl?: string
  duplicateDetected?: boolean
  existingDocument?: { fileUrl: string; id: string; originalFilename: string; version: number }
}> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr
    xhr.open('POST', '/api/documents')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(95, Math.round((event.loaded / event.total) * 100)))
      }
    }

    xhr.onload = () => {
      xhrRef.current = null
      try {
        const data = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100)
          resolve(data)
        } else {
          reject(new Error(data.error || `Upload failed (${xhr.status})`))
        }
      } catch {
        reject(new Error('Unexpected server response during upload.'))
      }
    }

    xhr.onerror = () => {
      xhrRef.current = null
      reject(new Error('Network error during upload. Check your connection and retry.'))
    }

    xhr.onabort = () => {
      xhrRef.current = null
      reject(new Error('UPLOAD_CANCELLED'))
    }

    const fd = new FormData()
    fd.append('file', file)
    if (allowDuplicate) fd.append('allowDuplicate', 'true')
    xhr.send(fd)
  })
}

export function DocumentHistoryPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (doc: RecentDocumentItem) => void
}) {
  const [query, setQuery] = useState('')
  const [mime, setMime] = useState<'ALL' | 'PDF' | 'IMAGE'>('ALL')
  const [items, setItems] = useState<RecentDocumentItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadDocs = useCallback(async (searchText: string, mimeFilter: 'ALL' | 'PDF' | 'IMAGE') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText.trim()) params.set('q', searchText.trim())
      if (mimeFilter !== 'ALL') params.set('mime', mimeFilter)
      const res = await fetch(`/api/documents/mine?${params.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as { items: RecentDocumentItem[] }
        setItems(data.items ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      loadDocs(query, mime)
    }, 180)
    return () => clearTimeout(timer)
  }, [open, query, mime, loadDocs])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Reuse Existing Document"
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Reuse from My Document Library</h3>
            <p className="text-xs text-muted-foreground">
              Select an existing authorized PDF or image instead of uploading a duplicate copy.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close document picker"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your recent files…"
              className="w-full rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="flex gap-1">
            {(['ALL', 'PDF', 'IMAGE'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setMime(k)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  mime === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
              <Loader2 size={15} className="mr-2 animate-spin" /> Loading your documents…
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No matching documents found in your library.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {doc.originalFilename}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(doc.sizeBytes)} · v{doc.version} ·{' '}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DocumentPreviewLink fileUrl={doc.pathname} label="Preview" />
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(doc)
                        onClose()
                      }}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      Attach
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export function SmartSingleDocumentField({
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
  const [dragActive, setDragActive] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const processFile = async (file: File, allowDuplicate = false) => {
    const clientErr = validateFileClient(file)
    if (clientErr) {
      setError(clientErr)
      return
    }
    setPendingFile(file)
    setError('')
    setDuplicateMatch(null)
    setUploading(true)
    setProgress(8)

    try {
      if (!allowDuplicate) {
        const sha256 = await computeFileSha256(file)
        if (sha256) {
          const chk = await fetch('/api/documents/check-checksum', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha256 }),
          })
          if (chk.ok) {
            const { match } = (await chk.json()) as { match: DuplicateMatch | null }
            if (match) {
              setDuplicateMatch(match)
              setUploading(false)
              setProgress(0)
              return
            }
          }
        }
      }

      const res = await uploadWithXhr(file, allowDuplicate, setProgress, xhrRef)
      if (res.duplicateDetected && res.existingDocument) {
        setDuplicateMatch({
          id: res.existingDocument.id,
          pathname: res.existingDocument.fileUrl,
          originalFilename: res.existingDocument.originalFilename,
          version: res.existingDocument.version,
        })
        setProgress(0)
        return
      }
      if (res.fileUrl) {
        setFileUrl(res.fileUrl)
        setPendingFile(null)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      if (msg === 'UPLOAD_CANCELLED') {
        setError('Upload cancelled.')
      } else {
        setError(msg)
      }
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={studentLabelClass}>
        {label}
      </label>
      <input type="hidden" name={name} value={fileUrl} />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          const f = e.dataTransfer.files?.[0]
          if (f) void processFile(f)
        }}
        className={`rounded-xl border border-dashed p-3 transition ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border bg-background/60'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={id}
            className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted focus-within:ring-2 focus-within:ring-ring"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {uploading ? 'Uploading…' : fileUrl ? 'Replace file' : 'Drop or choose PDF / Image'}
          </label>
          <input
            id={id}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void processFile(f)
              e.target.value = ''
            }}
            className="sr-only"
          />

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <FolderSearch size={14} /> Reuse existing
          </button>

          {fileUrl && <DocumentPreviewLink fileUrl={fileUrl} label="Preview file" />}
          {fileUrl && (
            <button
              type="button"
              onClick={() => {
                setFileUrl('')
                setProgress(0)
                setError('')
              }}
              className="text-xs font-medium text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <ProgressBar value={progress} label={`Uploading (${progress}%)…`} />
          </div>
          <button
            type="button"
            onClick={() => xhrRef.current?.abort()}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Cancel
          </button>
        </div>
      )}

      {duplicateMatch && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs">
          <span className="text-amber-800 dark:text-amber-200">
            Identical file already in your library: <strong>{duplicateMatch.originalFilename}</strong> (v{duplicateMatch.version}).
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFileUrl(duplicateMatch.pathname)
                setDuplicateMatch(null)
                setPendingFile(null)
              }}
              className="rounded-lg bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
            >
              Reuse Existing
            </button>
            {pendingFile && (
              <button
                type="button"
                onClick={() => void processFile(pendingFile, true)}
                className="rounded-lg border border-border bg-background px-2.5 py-1 font-medium"
              >
                Upload New Copy
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--status-rejected)]">
          <span>{error}</span>
          {pendingFile && !uploading && (
            <button
              type="button"
              onClick={() => void processFile(pendingFile)}
              className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-foreground hover:bg-muted"
            >
              <RefreshCw size={11} /> Retry
            </button>
          )}
        </div>
      )}

      <DocumentHistoryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(doc) => {
          setFileUrl(doc.pathname)
          setError('')
        }}
      />
    </div>
  )
}

export function SmartMultiDocumentField({
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
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setError('')
    setProgress(10)
    try {
      const added: string[] = []
      for (const file of files) {
        const clientErr = validateFileClient(file)
        if (clientErr) throw new Error(`${file.name}: ${clientErr}`)

        const sha256 = await computeFileSha256(file)
        if (sha256) {
          const chk = await fetch('/api/documents/check-checksum', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sha256 }),
          })
          if (chk.ok) {
            const { match } = (await chk.json()) as { match: DuplicateMatch | null }
            if (match) {
              if (!urls.includes(match.pathname) && !added.includes(match.pathname)) {
                added.push(match.pathname)
              }
              continue
            }
          }
        }

        const res = await uploadWithXhr(file, false, setProgress, xhrRef)
        const resolvedUrl = res.fileUrl ?? res.existingDocument?.fileUrl
        if (resolvedUrl && !urls.includes(resolvedUrl) && !added.includes(resolvedUrl)) {
          added.push(resolvedUrl)
        }
      }
      if (added.length > 0) setUrls((prev) => [...prev, ...added])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg === 'UPLOAD_CANCELLED' ? 'Upload cancelled.' : msg)
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={studentLabelClass}>
        {label}
      </label>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          void processFiles(Array.from(e.dataTransfer.files ?? []))
        }}
        className={`rounded-xl border border-dashed p-3 transition ${
          dragActive ? 'border-primary bg-primary/5' : 'border-border bg-background/60'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={id}
            className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {uploading ? 'Uploading…' : 'Drop or attach PDF / Images'}
          </label>
          <input
            id={id}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => {
              void processFiles(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            <FolderSearch size={14} /> Reuse existing
          </button>
        </div>
      </div>

      {uploading && (
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <ProgressBar value={progress} label={`Uploading (${progress}%)…`} />
          </div>
          <button
            type="button"
            onClick={() => xhrRef.current?.abort()}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-destructive"
          >
            Cancel
          </button>
        </div>
      )}

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
        <p role="alert" className="text-xs font-medium text-[var(--status-rejected)]">
          {error}
        </p>
      )}

      <DocumentHistoryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(doc) => {
          setUrls((prev) => (prev.includes(doc.pathname) ? prev : [...prev, doc.pathname]))
        }}
      />
    </div>
  )
}

export function FormDraftBanner({
  draftKey,
  formRef,
  clearWhenSuccess,
}: {
  draftKey: string
  formRef: RefObject<HTMLFormElement | null>
  clearWhenSuccess?: boolean
}) {
  const storageKey = `attainly-draft:${draftKey}`
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    try {
      setHasSavedDraft(Boolean(localStorage.getItem(storageKey)))
    } catch {
      // Ignore storage restrictions
    }
  }, [storageKey])

  useEffect(() => {
    if (!clearWhenSuccess) return
    try {
      localStorage.removeItem(storageKey)
      setHasSavedDraft(false)
    } catch {
      // Ignore
    }
  }, [clearWhenSuccess, storageKey])

  const saveDraft = () => {
    const form = formRef.current
    if (!form) return
    const data: Record<string, string> = {}
    const fd = new FormData(form)
    fd.forEach((val, key) => {
      if (typeof val === 'string') data[key] = val
    })
    try {
      localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), data }))
      setHasSavedDraft(true)
      setStatusMsg('Draft saved locally.')
      setTimeout(() => setStatusMsg(''), 2500)
    } catch {
      // Ignore
    }
  }

  const restoreDraft = () => {
    const form = formRef.current
    if (!form) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { data: Record<string, string> }
      for (const [k, v] of Object.entries(parsed.data ?? {})) {
        const el = form.elements.namedItem(k)
        if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
          if (el.type !== 'file' && el.type !== 'hidden') {
            el.value = v
          }
        }
      }
      setStatusMsg('Draft restored.')
      setTimeout(() => setStatusMsg(''), 2500)
    } catch {
      // Ignore
    }
  }

  const discardDraft = () => {
    try {
      localStorage.removeItem(storageKey)
      setHasSavedDraft(false)
      setStatusMsg('Draft discarded.')
      setTimeout(() => setStatusMsg(''), 2500)
    } catch {
      // Ignore
    }
  }

  return (
    <div className="sm:col-span-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <FileText size={13} />
        <span>{statusMsg || (hasSavedDraft ? 'Saved draft available for this form.' : 'Save progress as a local draft anytime.')}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={saveDraft}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 font-medium text-foreground hover:bg-muted"
        >
          <Save size={12} /> Save draft
        </button>
        {hasSavedDraft && (
          <>
            <button
              type="button"
              onClick={restoreDraft}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary hover:bg-primary/20"
            >
              <CheckCircle2 size={12} /> Restore
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={12} /> Discard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function DuplicateRecordSuggestionBanner({
  type,
  title,
  doi,
}: {
  type: 'ACHIEVEMENT' | 'CERTIFICATION' | 'PUBLICATION'
  title: string
  doi?: string
}) {
  const [matches, setMatches] = useState<Array<{ id: string; title: string; subtitle: string; status: string }>>([])

  useEffect(() => {
    const qTitle = title.trim()
    const qDoi = doi?.trim() ?? ''
    if (qTitle.length < 4 && qDoi.length < 4) {
      setMatches([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ type })
        if (qTitle) params.set('title', qTitle)
        if (qDoi) params.set('doi', qDoi)
        const res = await fetch(`/api/records/duplicate-check?${params.toString()}`)
        if (res.ok) {
          const data = (await res.json()) as {
            suggestions: Array<{ id: string; title: string; subtitle: string; status: string }>
          }
          setMatches(data.suggestions ?? [])
        }
      } catch {
        // Ignore
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [type, title, doi])

  if (matches.length === 0) return null

  return (
    <div className="sm:col-span-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-200">
        <AlertTriangle size={14} />
        <span>Possible duplicate record(s) found — review before submitting:</span>
      </div>
      <ul className="mt-1.5 space-y-1 text-amber-900/90 dark:text-amber-100/90">
        {matches.map((m) => (
          <li key={m.id}>
            • <strong>{m.title}</strong> ({m.subtitle}) — <span className="font-mono text-[11px]">{m.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
