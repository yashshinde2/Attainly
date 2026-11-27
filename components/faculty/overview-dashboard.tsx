'use client'

import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Circle,
  FileBadge,
  FileText,
  FlaskConical,
  FolderOpen,
  Layers,
  Plus,
} from 'lucide-react'
import type { FacultyOverviewData } from '@/lib/server/services/faculty-portfolio'
import { KpiCard, ProgressBar, SectionHeader } from '@/components/shared/attainly-ui'

export function FacultyOverviewDashboard({
  facultyName,
  email,
  data,
}: {
  facultyName: string
  email: string
  data: FacultyOverviewData
}) {
  const { profileSummary, completeness, counts, notifications } = data
  const mandatory = completeness.mandatory
  const optional = completeness.optional
  const actionRequiredCount = notifications.filter((n) => n.severity === 'action_required').length

  const initials =
    facultyName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'FA'

  return (
    <div className="space-y-6">
      {/* Faculty Academic Identity Card */}
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
                alt={facultyName}
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
                  {facultyName}
                </h1>
                <span className="rounded-full bg-[var(--status-verified-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--status-verified)]">
                  {profileSummary.employmentStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {profileSummary.employeeId && (
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono font-medium text-foreground">
                    {profileSummary.employeeId}
                  </span>
                )}
                {profileSummary.designation && (
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium text-foreground">
                    {profileSummary.designation}
                  </span>
                )}
                {profileSummary.departmentName && (
                  <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-muted-foreground">
                    {profileSummary.departmentName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/faculty/profile"
              prefetch={false}
              className="rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              Edit Profile
            </Link>
            <Link
              href="/faculty/cv"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <FileText size={14} /> Academic CV
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/faculty/research"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plus size={14} />
          </span>
          <span className="truncate">Add Publication</span>
        </Link>
        <Link
          href="/faculty/development"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <FileBadge size={14} />
          </span>
          <span className="truncate">Log FDP / Cert</span>
        </Link>
        <Link
          href="/faculty/experience"
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-xs font-semibold text-foreground shadow-[var(--shadow-card)] transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers size={14} />
          </span>
          <span className="truncate">Teaching Load</span>
        </Link>
        <Link
          href="/faculty/notifications"
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

      {/* Portfolio KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Publications & Patents"
          value={counts.publications + counts.patents}
          subtitle={`${counts.publications} publications · ${counts.patents} patents`}
          icon={FlaskConical}
          href="/faculty/research"
        />
        <KpiCard
          label="FDPs & Certifications"
          value={counts.fdps + counts.certifications}
          subtitle={`${counts.fdps} programs · ${counts.certifications} certifications`}
          icon={FileBadge}
          href="/faculty/development"
        />
        <KpiCard
          label="Teaching Workload"
          value={counts.teachingLoads}
          subtitle={`${counts.experiences} experience records`}
          icon={Layers}
          href="/faculty/experience"
        />
        <KpiCard
          label="Grants & Consultancy"
          value={counts.grants + counts.consultancies}
          subtitle={`${counts.grants} grants · ${counts.consultancies} consultancy`}
          icon={Briefcase}
          href="/faculty/consultancy"
        />
      </div>

      {/* Mandatory vs Optional Completeness */}
      <div className="grid gap-6 lg:grid-cols-2">
        {mandatory && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <SectionHeader
              title="Mandatory Academic Profile"
              description="Core identity, qualifications, and teaching history."
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
              title="Research, Development & Outreach"
              description="FDPs, publications, grants, consultancy, and contributions."
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

      {/* Actionable Notifications + Institutional Links */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Notifications &amp; Review Feedback</h3>
              {actionRequiredCount > 0 && (
                <span className="rounded-full bg-[var(--status-rejected-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--status-rejected)]">
                  {actionRequiredCount} action needed
                </span>
              )}
            </div>
            <Link href="/faculty/notifications" prefetch={false} className="text-xs font-medium text-primary hover:underline">
              View all &rarr;
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              All clear! No pending notifications.
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

        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-2.5">
          <h3 className="text-sm font-semibold text-foreground">Academic Workspace</h3>
          <Link
            href="/faculty/contributions"
            prefetch={false}
            className="flex items-center justify-between rounded-lg border border-border p-3 text-xs font-medium transition hover:bg-muted"
          >
            <span className="inline-flex items-center gap-2">
              <Award size={14} className="text-primary" /> Contributions ({counts.contributions})
            </span>
            <span>&rarr;</span>
          </Link>
          <Link
            href="/faculty/documents"
            prefetch={false}
            className="flex items-center justify-between rounded-lg border border-border p-3 text-xs font-medium transition hover:bg-muted"
          >
            <span className="inline-flex items-center gap-2">
              <FolderOpen size={14} className="text-primary" /> My Documents ({counts.documents})
            </span>
            <span>&rarr;</span>
          </Link>
          <Link
            href="/faculty/courses"
            prefetch={false}
            className="flex items-center justify-between rounded-lg border border-border p-3 text-xs font-medium transition hover:bg-muted"
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen size={14} className="text-primary" /> Institutional Courses
            </span>
            <span>&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  )
}
