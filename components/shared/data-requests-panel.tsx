'use client'

import { useActionState, useState } from 'react'
import { completeDataRequestAction, type InspectionActionState } from '@/app/actions/inspections'
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Upload } from 'lucide-react'

const initialState: InspectionActionState = { status: 'idle', message: '' }

export interface AssignedDataRequestItem {
  id: string
  title: string
  description: string | null
  targetType: string
  dueDate: Date | string | null
  status: string
  requireEvidence?: boolean
  reminderCount: number
  responseNote: string | null
  reviewFeedback?: string | null
  linkedDocumentId?: string | null
  linkedEntityType?: string | null
  linkedEntityId?: string | null
}

export interface RequestDocumentOption {
  id: string
  originalFilename: string
  entityType: string | null
}

export interface RequestRecordOption {
  entityType: string
  entityId: string
  label: string
}

function CompleteRequestForm({
  request,
  myDocuments,
  myRecords,
}: {
  request: AssignedDataRequestItem
  myDocuments: RequestDocumentOption[]
  myRecords: RequestRecordOption[]
}) {
  const [state, action, pending] = useActionState(completeDataRequestAction, initialState)
  const [uploadedDocId, setUploadedDocId] = useState(request.linkedDocumentId ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploadedDocId(data.documentId)
      setUploadMsg(`Uploaded: ${data.originalFilename}`)
    } catch (err) {
      setUploadMsg(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <form action={action} className="mt-3 space-y-3 border-t border-border pt-3">
      <input type="hidden" name="requestId" value={request.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-medium text-foreground">
            Select Existing Document {request.requireEvidence ? '(or link record / upload below)' : '(optional)'}
          </label>
          <select
            name="linkedDocumentId"
            value={uploadedDocId}
            onChange={(e) => setUploadedDocId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs"
          >
            <option value="">None selected</option>
            {myDocuments.map((d) => (
              <option key={d.id} value={d.id}>{d.originalFilename}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-medium text-foreground">Link Existing Profile Record (optional)</label>
          <select
            name="linkedRecord"
            defaultValue={
              request.linkedEntityType && request.linkedEntityId
                ? `${request.linkedEntityType}::${request.linkedEntityId}`
                : ''
            }
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs"
          >
            <option value="">None selected</option>
            {myRecords.map((rec) => (
              <option key={`${rec.entityType}::${rec.entityId}`} value={`${rec.entityType}::${rec.entityId}`}>
                {rec.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted">
          <Upload size={13} />
          <span>{uploading ? 'Uploading…' : 'Upload New Supporting Document'}</span>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" disabled={uploading} />
        </label>
        {uploadMsg && <span className="text-xs text-primary">{uploadMsg}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          name="responseNote"
          defaultValue={request.responseNote ?? ''}
          placeholder="Response note or details…"
          className="flex-1 min-w-[200px] rounded-xl border border-input bg-background px-3 py-1.5 text-xs"
        />
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? 'Submitting…' : request.requireEvidence ? 'Submit for Review' : 'Mark Completed'}
        </button>
      </div>

      {state.message && (
        <p className={`text-xs font-medium ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}>
          {state.message}
        </p>
      )}
    </form>
  )
}

export function DataRequestsPanel({
  requests,
  myDocuments = [],
  myRecords = [],
}: {
  requests: AssignedDataRequestItem[]
  myDocuments?: RequestDocumentOption[]
  myRecords?: RequestRecordOption[]
}) {
  if (requests.length === 0) return null

  const now = new Date()

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList size={18} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Assigned Data Collection Requests ({requests.filter((r) => r.status !== 'COMPLETED').length} open)
        </h2>
      </div>
      <div className="space-y-3">
        {requests.map((r) => {
          const isOverdue = Boolean(r.dueDate && new Date(r.dueDate) < now && r.status !== 'COMPLETED')
          const canSubmit = r.status === 'PENDING' || r.status === 'CORRECTION_REQUIRED'

          return (
            <div key={r.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    {r.requireEvidence && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                        Evidence Required
                      </span>
                    )}
                    {isOverdue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    )}
                  </div>
                  {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {r.dueDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={12} />
                      Due {new Date(r.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      r.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-700'
                        : r.status === 'CORRECTION_REQUIRED'
                          ? 'bg-destructive/15 text-destructive'
                          : r.status === 'SUBMITTED'
                            ? 'bg-blue-500/15 text-blue-700'
                            : 'bg-amber-500/15 text-amber-700'
                    }`}
                  >
                    {r.status === 'COMPLETED' && <CheckCircle2 size={11} />}
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {r.status === 'CORRECTION_REQUIRED' && r.reviewFeedback && (
                <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <strong>Correction requested:</strong> {r.reviewFeedback}
                </div>
              )}

              {canSubmit ? (
                <CompleteRequestForm request={r} myDocuments={myDocuments} myRecords={myRecords} />
              ) : (
                r.responseNote && <p className="mt-2 text-xs text-muted-foreground">Submitted: {r.responseNote}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
