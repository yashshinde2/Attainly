'use client'

import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Circle,
  FileBadge,
  FileText,
  FolderOpen,
  Layers,
  Plus,
  TrendingUp,
} from 'lucide-react'
import type { StudentOverviewData } from '@/lib/server/services/student-overview'
import type { ExpiringCredentialItem } from '@/lib/server/services/document-intelligence'
import { KpiCard, ProgressBar, SectionHeader } from '@/components/shared/attainly-ui'
import { VerificationBadge } from './shared-ui'

export function StudentOverviewDashboard({
  studentName,
  email,
  data,
  expiringCredentials,
}: {
  studentName: string
  email: string
  data: StudentOverviewData
  expiringCredentials?: {
    expired: ExpiringCredentialItem[]
    expiringSoon: ExpiringCredentialItem[]
  }
}) {
  const { profileSummary, completeness, counts, semesters, recentActivity, notifications } = data
  const latestSem = semesters.length > 0 ? semesters[semesters.length - 1] : null
  const mandatory = completeness.mandatory
  const optional = completeness.optional
  const actionRequiredCount = notifications.filter((n) => n.severity === 'action_required').length

  const initials =
    studentName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'ST'

  return (
    <div className="space-y-6 overflow-x-hidden">
      {expiringCredentials &&
        (expiringCredentials.expired.length > 0 || expiringCredentials.expiringSoon.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>
                <strong>Credential Expiry Reminder:</strong>{' '}
                {expiringCredentials.expired.length > 0
                  ? `${expiringCredentials.expired.length} expired`
                  : ''}
                {expiringCredentials.expired.length > 0 && expiringCredentials.expiringSoon.length > 0
                  ? ' and '
                  : ''}
                {expiringCredentials.expiringSoon.length > 0
                  ? `${expiringCredentials.expiringSoon.length} expiring within 60 days`
                  : ''}
                .
              </span>
            </div>
            <Link href="/student/certifications" className="font-semibold underline">
              Review Certifications →
            </Link>
          </div>
        )}
      {/* Student Profile Summary Card */}
      <section className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profileSummary.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  profileSummary.photoUrl.startsWith('http')
                    ? profileSummary.photoUrl
                    : `/api/documents?pathname=${encodeURIComponent(profileSummary.photoUrl)}&disposition=inline`
                }
                alt={studentName}
                className="size-14 rounded-xl border border-border object-cover sm:size-16"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-bold text-secondary-foreground sm:size-16">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {studentName}
                </h1>
                <span className="rounded-full bg-[var(--status-verified-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--status-verified)]">
                  {profileSummary.academicStatus}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {profileSummary.enrollmentNumber && (
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono font-medium text-foreground">
                    {profileSummary.enrollmentNumber}
                  </span>
                )}
                {profileSummary.departmentName && (
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium text-foreground">
                    {profileSummary.departmentName}
                  </span>
                )}
                {profileSummary.batchLabel && (
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-muted-foreground">
                    Batch {profileSummary.batchLabel}
                  </span>
                )}
                {profileSummary.currentSemester && (
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-muted-foreground">
                    Semester {profileSummary.currentSemester}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/student/profile"
              prefetch={false}
              className="rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              Edit Profile
            </Link>
            <Link
              href="/student/resume"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <FileText size={14} /> Resume Builder
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/student/achievements"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus size={14} />
          </span>
          <span className="truncate">Add Achievement</span>
        </Link>
        <Link
          href="/student/certifications"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <FileBadge size={14} />
          </span>
          <span className="truncate">Upload Certificate</span>
        </Link>
        <Link
          href="/student/events"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays size={14} />
          </span>
          <span className="truncate">Events ({counts.events})</span>
        </Link>
        <Link
          href="/student/notifications"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--status-pending-bg)] text-[var(--status-pending)]">
            <Bell size={14} />
          </span>
          <span className="truncate">
            Requests {actionRequiredCount > 0 ? `(${actionRequiredCount})` : ''}
          </span>
        </Link>
      </section>

      {/* Key Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Current CGPA"
          value={latestSem ? latestSem.cgpaAtSemester.toFixed(2) : '—'}
          subtitle={`${semesters.length} ${semesters.length === 1 ? 'semester' : 'semesters'} recorded`}
          icon={BookOpen}
          href="/student/academics"
        />
        <KpiCard
          label="Verified Achievements"
          value={`${counts.verifiedAchievements} / ${counts.achievements}`}
          subtitle={`${counts.certifications} certifications logged`}
          icon={Award}
          href="/student/achievements"
        />
        <KpiCard
          label="Projects & Internships"
          value={counts.projects + counts.internships}
          subtitle={`${counts.projects} projects · ${counts.internships} internships`}
          icon={Layers}
          href="/student/projects"
        />
        <KpiCard
          label="Placement Offers"
          value={counts.placementOffers}
          subtitle="Career & graduate outcomes"
          icon={Briefcase}
          href="/student/career"
        />
      </div>

      {/* Mandatory vs Optional Profile Completeness Checklists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {mandatory && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionHeader
              title="Mandatory Profile Completeness"
              description="Core academic & identity records required for institutional verification."
              actions={
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {mandatory.percentage}%
                </span>
              }
            />
            <div className="mt-3">
              <ProgressBar value={mandatory.percentage} />
            </div>
            <ul className="mt-4 space-y-2">
              {mandatory.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 size={14} className="text-[var(--status-verified)]" />
                    ) : (
                      <Circle size={14} className="text-muted-foreground" />
                    )}
                    <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                  </span>
                  {item.href && !item.complete && (
                    <Link href={item.href} prefetch={false} className="font-medium text-primary hover:underline">
                      Complete &rarr;
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {optional && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionHeader
              title="Portfolio & Engagement"
              description="Co-curricular, research, and career milestones that strengthen your profile."
              actions={
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                  {optional.percentage}%
                </span>
              }
            />
            <div className="mt-3">
              <ProgressBar value={optional.percentage} />
            </div>
            <ul className="mt-4 space-y-2">
              {optional.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 size={14} className="text-[var(--status-verified)]" />
                    ) : (
                      <Circle size={14} className="text-muted-foreground" />
                    )}
                    <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                  </span>
                  {item.href && (
                    <Link href={item.href} prefetch={false} className="font-medium text-primary hover:underline">
                      {item.complete ? 'View' : 'Add'} &rarr;
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Academic Performance Chart + Actionable Notifications */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Academic Progression</h3>
            </div>
            <Link href="/student/academics" prefetch={false} className="text-xs font-medium text-primary hover:underline">
              Full details &rarr;
            </Link>
          </div>
          {semesters.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No semester grades recorded yet. Add your semester SGPA/CGPA in Academics.
            </div>
          ) : (
            <div className="mt-5 flex items-end gap-3 overflow-x-auto pb-2" style={{ minHeight: '150px' }}>
              {semesters.map((sem) => {
                const heightPct = Math.max(12, Math.min(100, (sem.sgpa / 10) * 100))
                return (
                  <div key={sem.semesterNumber} className="flex min-w-[48px] flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold text-primary">
                      {sem.sgpa.toFixed(2)}
                    </span>
                    <div className="flex h-24 w-full items-end justify-center rounded-lg bg-muted/50 p-1">
                      <div
                        className="w-full max-w-[26px] rounded-md bg-primary transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`Sem ${sem.semesterNumber}: SGPA ${sem.sgpa}, CGPA ${sem.cgpaAtSemester}`}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">Sem {sem.semesterNumber}</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Actionable Notifications</h3>
              {actionRequiredCount > 0 && (
                <span className="rounded-full bg-[var(--status-rejected-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--status-rejected)]">
                  {actionRequiredCount} action needed
                </span>
              )}
            </div>
            <Link href="/student/notifications" prefetch={false} className="text-xs font-medium text-primary hover:underline">
              View all &rarr;
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              You are all caught up! No pending notifications.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {notifications.slice(0, 4).map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  prefetch={false}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary/40"
                >
                  <div className="flex items-start gap-2.5">
                    {n.severity === 'action_required' ? (
                      <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--status-rejected)]" />
                    ) : n.severity === 'success' ? (
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--status-verified)]" />
                    ) : (
                      <Bell size={15} className="mt-0.5 shrink-0 text-primary" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{n.message}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Activity & Quick Document Access */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">No recent submissions yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {recentActivity.map((act) => (
                <Link
                  key={act.id}
                  href={act.href}
                  prefetch={false}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs transition hover:bg-muted/30"
                >
                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-foreground">{act.title}</span>
                    <span className="ml-2 text-muted-foreground">&bull; {act.type}</span>
                  </div>
                  <VerificationBadge status={act.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Document Library</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {counts.documents} {counts.documents === 1 ? 'document' : 'documents'} stored securely in your institutional vault.
            </p>
          </div>
          <Link
            href="/student/documents"
            prefetch={false}
            className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Open My Documents &rarr;
          </Link>
        </section>
      </div>
    </div>
  )
}
