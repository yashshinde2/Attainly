'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Clock, ExternalLink, Eye, History, UserCheck } from 'lucide-react'
import {
  assignVerificationReviewerAction,
  setVerificationStatusAction,
  type VerificationActionState,
} from '@/app/actions/verification'
import { DocumentPreviewDrawer } from '@/components/shared/attainly-ui'
import type { VerificationCenterItem } from '@/lib/server/services/verification'

const initialState: VerificationActionState = { status: 'idle', message: '' }

function VerificationRow({
  item,
  reviewers,
}: {
  item: VerificationCenterItem
  reviewers: Array<{ id: string; name: string }>
}) {
  const [approveState, approveAction, approvePending] = useActionState(setVerificationStatusAction, initialState)
  const [rejectState, rejectAction, rejectPending] = useActionState(setVerificationStatusAction, initialState)
  const [assignState, assignAction, assignPending] = useActionState(assignVerificationReviewerAction, initialState)
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const previewHref = item.fileUrl
    ? item.fileUrl.startsWith('http')
      ? item.fileUrl
      : `/api/documents?pathname=${encodeURIComponent(item.fileUrl)}&disposition=inline`
    : null
  const previewMime = item.fileUrl?.toLowerCase().endsWith('.png')
    ? 'image/png'
    : item.fileUrl?.toLowerCase().match(/\.(jpg|jpeg)$/)
      ? 'image/jpeg'
      : 'application/pdf'

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {item.itemType.replace(/_/g, ' ')}
            </span>
            {item.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--status-pending-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--status-pending)]">
                <Clock size={11} /> Overdue (&gt;7d)
              </span>
            )}
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted by <strong className="text-foreground">{item.studentName}</strong> ({item.studentEmail})
            {item.enrollmentNumber && ` • ${item.enrollmentNumber}`}
            {' • '}
            {new Date(item.submittedAt).toLocaleDateString()}
          </p>
          {item.details && <p className="mt-1 text-xs text-foreground/80">{item.details}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {previewHref && (
              <span className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Eye size={13} /> Preview Evidence
                </button>
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open evidence in new tab"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink size={12} />
                </a>
              </span>
            )}
            {item.assignedReviewerName && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--status-verified)]">
                <UserCheck size={13} /> Assigned to: {item.assignedReviewerName}
              </span>
            )}
          </div>
        </div>

        <DocumentPreviewDrawer
          open={previewOpen}
          title={`${item.title} — Evidence`}
          documentUrl={previewHref}
          mimeType={previewMime}
          onClose={() => setPreviewOpen(false)}
        />

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <form action={approveAction}>
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="itemType" value={item.itemType} />
              <input type="hidden" name="status" value="VERIFIED" />
              <input type="hidden" name="expectedVersion" value={item.version} />
              <button
                type="submit"
                disabled={approvePending || rejectPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {approvePending ? 'Saving…' : 'Approve'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setShowReject((v) => !v)}
              className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              {showReject ? 'Cancel' : 'Request Correction / Reject'}
            </button>
          </div>

          <form action={assignAction} className="flex items-center gap-1.5">
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="itemType" value={item.itemType} />
            <select
              name="assignedToUserId"
              defaultValue={item.assignedToUserId ?? ''}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none"
            >
              <option value="">Assign reviewer…</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={assignPending}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              Assign
            </button>
          </form>
        </div>
      </div>

      {showReject && (
        <form action={rejectAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="itemType" value={item.itemType} />
          <input type="hidden" name="status" value="REJECTED" />
          <input type="hidden" name="expectedVersion" value={item.version} />
          <input
            type="text"
            name="rejectionReason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Correction feedback / rejection reason (required)"
            className="min-w-[260px] flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none"
          />
          <button
            type="submit"
            disabled={rejectPending || !reason.trim()}
            className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {rejectPending ? 'Submitting…' : 'Send Feedback & Reject'}
          </button>
        </form>
      )}

      {approveState.status === 'error' && <p className="text-xs text-destructive">{approveState.message}</p>}
      {rejectState.status === 'error' && <p className="text-xs text-destructive">{rejectState.message}</p>}
      {assignState.status === 'error' && <p className="text-xs text-destructive">{assignState.message}</p>}
    </div>
  )
}

export function AdminVerificationCenterClient({
  items,
  reviewers,
  history,
  filters,
}: {
  items: VerificationCenterItem[]
  reviewers: Array<{ id: string; name: string }>
  history: Array<{
    id: string
    itemType: string
    itemId: string
    action: string
    actorName: string
    assignedToName: string | null
    comment: string | null
    createdAt: Date
  }>
  filters: Record<string, string>
}) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Centralized Verification Center</h2>
            <p className="text-xs text-muted-foreground">
              {items.length} pending {items.length === 1 ? 'claim' : 'claims'} &bull; Self-verification is blocked
            </p>
          </div>
        </div>

        <form action="/admin/verifications" method="GET" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 p-3.5 text-xs">
          <select name="itemType" defaultValue={filters.itemType ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 outline-none">
            <option value="">All Record Types</option>
            <option value="ACHIEVEMENT">Student Achievements</option>
            <option value="CERTIFICATION">Student Certifications</option>
            <option value="RESEARCH_PAPER">Student Research Papers</option>
            <option value="PATENT">Student Patents</option>
            <option value="INTERNSHIP">Student Internships</option>
            <option value="PLACEMENT_OFFER">Placement Offers</option>
            <option value="GRADUATE_OUTCOME">Graduate Outcomes</option>
            <option value="FACULTY_FDP">Faculty FDPs</option>
            <option value="FACULTY_CERTIFICATION">Faculty Certifications</option>
            <option value="CANONICAL_PUBLICATION">Faculty Publications</option>
            <option value="FACULTY_GRANT">Faculty Grants</option>
            <option value="FACULTY_CONSULTANCY">Faculty Consultancy</option>
            <option value="FACULTY_CONTRIBUTION">Faculty Contributions</option>
          </select>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="overdueOnly" value="1" defaultChecked={filters.overdueOnly === '1'} className="accent-indigo-600" />
            Overdue (&gt;7 days)
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" name="assignedToMe" value="1" defaultChecked={filters.assignedToMe === '1'} className="accent-indigo-600" />
            Assigned to me
          </label>
          <button type="submit" className="rounded-xl bg-primary px-3.5 py-2 font-semibold text-white">Filter</button>
          <Link href="/admin/verifications" className="rounded-xl border border-border px-3 py-2">Reset</Link>
        </form>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No pending verification items match the selected filters.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <VerificationRow key={`${item.itemType}-${item.id}`} item={item} reviewers={reviewers} />
            ))}
          </div>
        )}
      </section>

      {/* Verification Audit History */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <History size={16} className="text-indigo-600" />
          <h3 className="text-sm font-semibold">Recent Verification History</h3>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No verification audit entries recorded yet.</p>
        ) : (
          <div className="divide-y divide-border text-xs">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <span className="font-semibold text-foreground">{h.actorName}</span>{' '}
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold">{h.action}</span>{' '}
                  <span className="text-muted-foreground">{h.itemType.replace(/_/g, ' ')}</span>
                  {h.assignedToName && <span> &rarr; {h.assignedToName}</span>}
                  {h.comment && <span className="ml-2 italic text-muted-foreground">&ldquo;{h.comment}&rdquo;</span>}
                </div>
                <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
