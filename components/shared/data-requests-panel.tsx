'use client'

import { useActionState } from 'react'
import { completeDataRequestAction, type InspectionActionState } from '@/app/actions/inspections'
import { CheckCircle2, ClipboardList, Clock } from 'lucide-react'

const initialState: InspectionActionState = { status: 'idle', message: '' }

export interface AssignedDataRequestItem {
  id: string
  title: string
  description: string | null
  targetType: string
  dueDate: Date | string | null
  status: string
  reminderCount: number
  responseNote: string | null
}

function CompleteRequestForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(completeDataRequestAction, initialState)
  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <input
        name="responseNote"
        placeholder="Reference / note (e.g. Uploaded to My Documents)"
        className="flex-1 min-w-[200px] rounded-xl border border-input bg-background px-3 py-1.5 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        {pending ? 'Submitting…' : 'Mark Completed'}
      </button>
      {state.message && (
        <span className={`text-xs ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}>
          {state.message}
        </span>
      )}
    </form>
  )
}

export function DataRequestsPanel({ requests }: { requests: AssignedDataRequestItem[] }) {
  if (requests.length === 0) return null

  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList size={18} className="text-primary" />
        <h2 className="text-base font-semibold text-foreground">
          Assigned Data Collection Requests ({requests.filter((r) => r.status !== 'COMPLETED').length} pending)
        </h2>
      </div>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{r.title}</p>
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
                      : 'bg-amber-500/15 text-amber-700'
                  }`}
                >
                  {r.status === 'COMPLETED' && <CheckCircle2 size={11} />}
                  {r.status}
                </span>
              </div>
            </div>
            {r.status !== 'COMPLETED' ? (
              <CompleteRequestForm requestId={r.id} />
            ) : (
              r.responseNote && <p className="mt-2 text-xs text-muted-foreground">Submitted: {r.responseNote}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
