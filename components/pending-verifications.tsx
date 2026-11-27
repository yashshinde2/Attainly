'use client'

import { useActionState, useState } from 'react'
import type { PendingVerificationItem } from '@/lib/server/services/verification'
import { setVerificationStatusAction, type VerificationActionState } from '@/app/actions/verification'

const initialState: VerificationActionState = { status: 'idle', message: '' }

function VerificationControls({
  itemId,
  itemType,
  version,
}: {
  itemId: string
  itemType: string
  version: number
}) {
  const [approveState, approveAction, approvePending] = useActionState(setVerificationStatusAction, initialState)
  const [rejectState, rejectAction, rejectPending] = useActionState(setVerificationStatusAction, initialState)
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <form action={approveAction} className="inline-block">
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="itemType" value={itemType} />
          <input type="hidden" name="status" value="VERIFIED" />
          <input type="hidden" name="expectedVersion" value={version} />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approvePending ? 'Saving…' : 'Approve'}
          </button>
        </form>

        <button
          type="button"
          disabled={approvePending || rejectPending}
          onClick={() => setShowRejectBox((v) => !v)}
          className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-60"
        >
          {showRejectBox ? 'Cancel' : 'Reject'}
        </button>
      </div>

      {showRejectBox && (
        <form action={rejectAction} className="flex w-full min-w-[240px] flex-col gap-2 sm:w-72">
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="itemType" value={itemType} />
          <input type="hidden" name="status" value="REJECTED" />
          <input type="hidden" name="expectedVersion" value={version} />
          <input
            type="text"
            name="rejectionReason"
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={rejectPending || !reason.trim()}
            className="self-end rounded-lg bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {rejectPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
        </form>
      )}

      {approveState.status === 'error' && approveState.message && (
        <span className="text-xs text-destructive">{approveState.message}</span>
      )}
      {rejectState.status === 'error' && rejectState.message && (
        <span className="text-xs text-destructive">{rejectState.message}</span>
      )}
    </div>
  )
}

export function PendingVerifications({ items }: { items: PendingVerificationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No student or faculty claims currently pending verification.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={`${item.itemType}-${item.id}`}
          className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 transition sm:flex-row sm:items-start"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {item.itemType.replace(/_/g, ' ')}
              </span>
              <h3 className="truncate font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted by <span className="font-medium text-foreground">{item.studentName}</span> ({item.studentEmail})
              {item.enrollmentNumber && <span> • Roll/Enrollment: {item.enrollmentNumber}</span>}
              <span> • {new Date(item.submittedAt).toLocaleDateString()}</span>
            </p>
            {item.details && <p className="mt-1 text-xs text-foreground/80">{item.details}</p>}
            {item.fileUrl && (
              <a
                href={
                  item.fileUrl.startsWith('http')
                    ? item.fileUrl
                    : `/api/documents?pathname=${encodeURIComponent(item.fileUrl)}&disposition=inline`
                }
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block text-xs font-medium text-primary underline hover:opacity-80"
              >
                Preview attached evidence &rarr;
              </a>
            )}
          </div>
          <VerificationControls itemId={item.id} itemType={item.itemType} version={item.version} />
        </div>
      ))}
    </div>
  )
}
