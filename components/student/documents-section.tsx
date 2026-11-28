'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Download, Eye, FileText, FileUp, History, Loader2, RefreshCw, Search, X } from 'lucide-react'
import type { Document } from '@/generated/prisma/client'
import { DocumentPreviewDrawer } from '@/components/shared/attainly-ui'
import { StudentSectionHeader } from './shared-ui'

export function StudentDocumentsSection({
  items,
  total,
  page,
  pageSize,
  initialQuery = '',
  basePath = '/student/documents',
}: {
  items: Document[]
  total: number
  page: number
  pageSize: number
  initialQuery?: string
  basePath?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [mimeFilter, setMimeFilter] = useState<'ALL' | 'PDF' | 'IMAGE'>('ALL')
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [versionModalDoc, setVersionModalDoc] = useState<Document | null>(null)
  const [versions, setVersions] = useState<Document[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [replaceMessage, setReplaceMessage] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const filteredItems = useMemo(() => {
    if (mimeFilter === 'ALL') return items
    if (mimeFilter === 'PDF') return items.filter((d) => d.mimeType === 'application/pdf')
    return items.filter((d) => d.mimeType.startsWith('image/'))
  }, [items, mimeFilter])

  const openVersionModal = async (doc: Document) => {
    setVersionModalDoc(doc)
    setReplaceMessage('')
    setVersionsLoading(true)
    try {
      const res = await fetch(`/api/documents/${doc.id}/versions`)
      if (res.ok) {
        const data = (await res.json()) as { versions: Document[] }
        setVersions(data.versions ?? [])
      }
    } finally {
      setVersionsLoading(false)
    }
  }

  const handleReplaceVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !versionModalDoc) return
    setReplacing(true)
    setReplaceMessage('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`/api/documents/${versionModalDoc.id}/versions`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Replacement failed')
      await openVersionModal(data.document)
      setReplaceMessage(
        data.verificationReset
          ? `Uploaded v${data.document.version}. Linked approved record was reset to PENDING for re-verification.`
          : `Uploaded v${data.document.version} successfully.`,
      )
      router.refresh()
    } catch (err) {
      setReplaceMessage(err instanceof Error ? err.message : 'Replacement failed')
    } finally {
      setReplacing(false)
      e.target.value = ''
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    setUploadSuccess('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      if (data.duplicateDetected && data.existingDocument) {
        setUploadSuccess(
          `Identical file already exists ("${data.existingDocument.originalFilename}", v${data.existingDocument.version}). Reusing existing record.`,
        )
      } else {
        setUploadSuccess(`Uploaded "${data.originalFilename}"`)
        router.refresh()
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <StudentSectionHeader
        title="My Document Library"
        description="Centralized vault of all your uploaded certificates, letters, transcripts, and supporting evidence."
        badge={`${total} ${total === 1 ? 'Document' : 'Documents'}`}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <form action={basePath} method="GET" className="flex flex-1 min-w-[220px] max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by filename..."
              className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
            />
          </div>
          <button type="submit" className="rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-semibold">
            Search
          </button>
        </form>

        <div>
          <label
            htmlFor="vault-upload"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <FileUp size={14} /> {uploading ? 'Uploading…' : 'Upload Document'}
          </label>
          <input id="vault-upload" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} className="sr-only" />
        </div>
      </div>

      {uploadError && <p role="alert" className="mb-3 text-xs text-[var(--status-rejected)]">{uploadError}</p>}
      {uploadSuccess && <p role="status" className="mb-3 text-xs font-medium text-[var(--status-verified)]">{uploadSuccess}</p>}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(['ALL', 'PDF', 'IMAGE'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setMimeFilter(kind)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${mimeFilter === kind
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            {kind === 'ALL' ? 'All Files' : kind === 'PDF' ? 'PDF Documents' : 'Images'}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No documents found. Upload a PDF, PNG, or JPEG file above.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredItems.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={16} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{doc.originalFilename}</p>
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      v{doc.version}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {doc.mimeType} &bull; {(doc.sizeBytes / 1024).toFixed(1)} KB &bull; Uploaded{' '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                    {doc.entityType ? ` • ${doc.entityType}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDoc(doc)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-muted"
                >
                  <Eye size={13} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => void openVersionModal(doc)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <History size={13} /> Versions / Replace
                </button>
                <a
                  href={`/api/documents?pathname=${encodeURIComponent(doc.pathname)}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Download size={13} /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <DocumentPreviewDrawer
        open={Boolean(previewDoc)}
        title={previewDoc?.originalFilename ?? 'Document Preview'}
        documentUrl={
          previewDoc
            ? `/api/documents?pathname=${encodeURIComponent(previewDoc.pathname)}&disposition=inline`
            : null
        }
        mimeType={previewDoc?.mimeType}
        onClose={() => setPreviewDoc(null)}
      />

      {versionModalDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Document Version History"
        >
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Version History — {versionModalDoc.originalFilename}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Replacing approved evidence preserves audit logs and resets verification to PENDING.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVersionModalDoc(null)}
                aria-label="Close version history"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <div className="border-b border-border px-5 py-3">
              <label
                htmlFor="replace-doc-version"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                {replacing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {replacing ? 'Uploading new version…' : 'Upload Replacement Version'}
              </label>
              <input
                id="replace-doc-version"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleReplaceVersion}
                className="sr-only"
              />
              {replaceMessage && (
                <p role="status" className="mt-2 text-xs font-medium text-primary">
                  {replaceMessage}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {versionsLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 size={14} className="mr-2 animate-spin" /> Loading versions…
                </div>
              ) : (
                <ul className="space-y-2">
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          v{v.version} — {v.originalFilename}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {(v.sizeBytes / 1024).toFixed(1)} KB · {new Date(v.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(v)}
                        className="rounded-lg border border-border px-2.5 py-1 font-medium text-primary hover:bg-muted"
                      >
                        Preview
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`${basePath}?page=${page - 1}${initialQuery ? `&q=${encodeURIComponent(initialQuery)}` : ''}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`${basePath}?page=${page + 1}${initialQuery ? `&q=${encodeURIComponent(initialQuery)}` : ''}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
