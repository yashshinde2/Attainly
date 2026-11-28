'use client'

import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileQuestion,
  Loader2,
  Search,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/* 1. Page & Section Headers                                                  */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  badge?: string
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {badge && (
            <span className="rounded-full border border-border bg-muted/70 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 2. KPI Card & Profile Header                                               */
/* -------------------------------------------------------------------------- */

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  href?: string
}) {
  const inner = (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition hover:border-primary/35">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon aria-hidden="true" size={15} />
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {inner}
      </Link>
    )
  }
  return inner
}

export function ProfileHeader({
  name,
  subtitle,
  badges = [],
  actions,
}: {
  name: string
  subtitle?: string
  badges?: string[]
  actions?: ReactNode
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
          {initials}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{name}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {badges.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {badges.map((b) => (
                <span key={b} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 3. Verification Status, Progress & Record Card                             */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES: Record<string, { bg: string; text: string; Icon: LucideIcon }> = {
  VERIFIED: { bg: 'bg-[var(--status-verified-bg)]', text: 'text-[var(--status-verified)]', Icon: CheckCircle2 },
  COMPLETED: { bg: 'bg-[var(--status-verified-bg)]', text: 'text-[var(--status-verified)]', Icon: CheckCircle2 },
  CONFIRMED: { bg: 'bg-[var(--status-verified-bg)]', text: 'text-[var(--status-verified)]', Icon: CheckCircle2 },
  PUBLISHED: { bg: 'bg-[var(--status-verified-bg)]', text: 'text-[var(--status-verified)]', Icon: CheckCircle2 },
  PENDING: { bg: 'bg-[var(--status-pending-bg)]', text: 'text-[var(--status-pending)]', Icon: Clock },
  QUEUED: { bg: 'bg-[var(--status-pending-bg)]', text: 'text-[var(--status-pending)]', Icon: Clock },
  PROCESSING: { bg: 'bg-[var(--status-info-bg)]', text: 'text-[var(--status-info)]', Icon: Loader2 },
  REJECTED: { bg: 'bg-[var(--status-rejected-bg)]', text: 'text-[var(--status-rejected)]', Icon: XCircle },
  FAILED: { bg: 'bg-[var(--status-rejected-bg)]', text: 'text-[var(--status-rejected)]', Icon: XCircle },
  CANCELLED: { bg: 'bg-muted', text: 'text-muted-foreground', Icon: XCircle },
}

export function VerificationBadge({ status }: { status: string }) {
  const key = status.toUpperCase()
  const style = STATUS_STYLES[key] ?? { bg: 'bg-muted', text: 'text-muted-foreground', Icon: Clock }
  const Icon = style.Icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}>
      <Icon aria-hidden="true" size={11} className={key === 'PROCESSING' ? 'animate-spin' : ''} />
      {status}
    </span>
  )
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-medium text-foreground">{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function RecordCard({
  title,
  subtitle,
  status,
  meta,
  actions,
}: {
  title: string
  subtitle?: string
  status?: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <article className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {status && <VerificationBadge status={status} />}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {meta && <div className="pt-1 text-xs text-muted-foreground">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </article>
  )
}

/* -------------------------------------------------------------------------- */
/* 4. Filter Bar, Search Input & Data Table                                   */
/* -------------------------------------------------------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  ariaLabel,
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-8 text-xs text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      {children}
    </div>
  )
}

export function DataTable({
  headers,
  children,
  empty,
}: {
  headers: string[]
  children: ReactNode
  empty?: ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
      {empty}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* 5. Empty, Loading, Error States & Feedback                                 */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = FileQuestion,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden="true" size={18} />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl border border-border bg-muted/60" />
      ))}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-[var(--status-rejected-bg)] px-4 py-3 text-xs text-[var(--status-rejected)]"
    >
      <div className="flex items-center gap-2">
        <AlertCircle aria-hidden="true" size={16} />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-current px-2.5 py-1 text-[11px] font-semibold hover:opacity-80"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function SubmitButton({
  pending,
  label,
  pendingLabel = 'Saving…',
  disabled,
  className = '',
}: {
  pending: boolean
  label: string
  pendingLabel?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      {pending && <Loader2 aria-hidden="true" size={14} className="animate-spin" />}
      {pending ? pendingLabel : label}
    </button>
  )
}

export function FormFeedback({
  status,
  message,
}: {
  status: 'idle' | 'success' | 'error'
  message?: string
}) {
  if (status === 'idle' || !message) return null
  const isErr = status === 'error'
  return (
    <p
      role={isErr ? 'alert' : 'status'}
      className={`rounded-lg px-3 py-2 text-xs font-medium ${
        isErr
          ? 'bg-[var(--status-rejected-bg)] text-[var(--status-rejected)]'
          : 'bg-[var(--status-verified-bg)] text-[var(--status-verified)]'
      }`}
    >
      {message}
    </p>
  )
}

/* -------------------------------------------------------------------------- */
/* 6. Accessible Confirm Dialog & Document Preview Drawer                     */
/* -------------------------------------------------------------------------- */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pending, onCancel])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 id="confirm-dialog-title" className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 ${
              destructive ? 'bg-destructive' : 'bg-primary'
            }`}
          >
            {pending && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DocumentPreviewDrawer({
  open,
  title,
  documentUrl,
  mimeType,
  onClose,
}: {
  open: boolean
  title: string
  documentUrl: string | null
  mimeType?: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !documentUrl) return null
  const isImage = mimeType?.startsWith('image/')
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              <ExternalLink size={12} /> New Tab
            </a>
            <a
              href={documentUrl.replace('disposition=inline', 'disposition=attachment')}
              download
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Download size={12} /> Download
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document preview"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={documentUrl} alt={title} className="mx-auto max-h-full rounded-lg border border-border object-contain" />
          ) : (
            <iframe src={documentUrl} title={title} className="h-full min-h-[70vh] w-full rounded-lg border border-border bg-card" />
          )}
        </div>
      </div>
    </div>
  )
}
