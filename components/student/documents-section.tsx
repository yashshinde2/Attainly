'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Download, Eye, FileText, FileUp, Search } from 'lucide-react'
import type { Document } from '@/generated/prisma/client'
import { StudentSectionHeader } from './shared-ui'

export function StudentDocumentsSection({
  items,
  total,
  page,
  pageSize,
  initialQuery = '',
}: {
  items: Document[]
  total: number
  page: number
  pageSize: number
  initialQuery?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
      setUploadSuccess(`Uploaded "${data.originalFilename}"`)
      router.refresh()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <StudentSectionHeader
        title="My Document Library"
        description="Centralized vault of all your uploaded certificates, letters, transcripts, and supporting evidence."
        badge={`${total} ${total === 1 ? 'Document' : 'Documents'}`}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <form action="/student/documents" method="GET" className="flex flex-1 min-w-[220px] max-w-md items-center gap-2">
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            <FileUp size={14} /> {uploading ? 'Uploading…' : 'Upload Document'}
          </label>
          <input id="vault-upload" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} className="sr-only" />
        </div>
      </div>

      {uploadError && <p className="mb-3 text-xs text-destructive">{uploadError}</p>}
      {uploadSuccess && <p className="mb-3 text-xs font-medium text-teal-600">{uploadSuccess}</p>}

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No documents found. Upload a PDF, PNG, or JPEG file above.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                  <FileText size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{doc.originalFilename}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.mimeType} &bull; {(doc.sizeBytes / 1024).toFixed(1)} KB &bull; Uploaded{' '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/documents?pathname=${encodeURIComponent(doc.pathname)}&disposition=inline`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-muted"
                >
                  <Eye size={13} /> Preview
                </a>
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

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/student/documents?page=${page - 1}${initialQuery ? `&q=${encodeURIComponent(initialQuery)}` : ''}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/student/documents?page=${page + 1}${initialQuery ? `&q=${encodeURIComponent(initialQuery)}` : ''}`}
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
