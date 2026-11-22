'use client'

import { useActionState } from 'react'
import type { PendingVerificationItem } from '@/lib/server/services/verification'
import { setVerificationStatusAction, type VerificationActionState } from '@/app/actions/verification'

const initialState: VerificationActionState = { status: 'idle', message: '' }

function VerificationButton({
  itemId,
  itemType,
  status,
  label,
  variant,
}: {
  itemId: string
  itemType: string
  status: 'VERIFIED' | 'REJECTED'
  label: string
  variant: 'approve' | 'reject'
}) {
  const [state, action, pending] = useActionState(setVerificationStatusAction, initialState)

  return (
    <form action={action} className="inline-block">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="itemType" value={itemType} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          variant === 'approve'
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
        }`}
      >
        {pending ? 'Saving…' : label}
      </button>
      {state.message && state.status === 'error' && (
        <span className="ml-2 text-xs text-destructive">{state.message}</span>
      )}
    </form>
  )
}

export function PendingVerifications({ items }: { items: PendingVerificationItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No student claims currently pending verification.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div
          key={`${item.itemType}-${item.id}`}
          className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 transition sm:flex-row sm:items-center"
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
                href={item.fileUrl.startsWith('http') ? item.fileUrl : `/api/documents?pathname=${encodeURIComponent(item.fileUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-medium text-primary underline hover:opacity-80"
              >
                View attached document
              </a>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <VerificationButton
              itemId={item.id}
              itemType={item.itemType}
              status="VERIFIED"
              label="Approve"
              variant="approve"
            />
            <VerificationButton
              itemId={item.id}
              itemType={item.itemType}
              status="REJECTED"
              label="Reject"
              variant="reject"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
