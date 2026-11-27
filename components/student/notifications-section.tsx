import Link from 'next/link'
import { AlertCircle, ArrowRight, Bell, CheckCircle2 } from 'lucide-react'
import type { StudentNotificationItem } from '@/lib/server/services/student-overview'
import { StudentSectionHeader } from './shared-ui'

export function StudentNotificationsSection({
  notifications,
}: {
  notifications: StudentNotificationItem[]
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <StudentSectionHeader
        title="Notifications & Action Items"
        description="Reviewer feedback, verification updates, and profile completion reminders."
        badge={`${notifications.length} Total`}
      />

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You have no pending notifications or action items.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              prefetch={true}
              className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4 transition hover:border-indigo-500/50"
            >
              <div className="flex items-start gap-3">
                {n.severity === 'action_required' ? (
                  <AlertCircle size={18} className="mt-0.5 shrink-0 text-destructive" />
                ) : n.severity === 'success' ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-600" />
                ) : (
                  <Bell size={18} className="mt-0.5 shrink-0 text-indigo-600" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600">
                Open <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
