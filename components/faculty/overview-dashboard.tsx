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
} from 'lucide-react'
import type { FacultyOverviewData } from '@/lib/server/services/faculty-portfolio'

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

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Deep Navy / Indigo Hero Header */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profileSummary.photoUrl ? (
              <img
                src={
                  profileSummary.photoUrl.startsWith('http')
                    ? profileSummary.photoUrl
                    : `/api/documents?pathname=${encodeURIComponent(profileSummary.photoUrl)}&disposition=inline`
                }
                alt={facultyName}
                className="h-16 w-16 rounded-2xl border-2 border-teal-400/50 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/30 text-xl font-bold text-teal-300">
                {facultyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{facultyName}</h2>
                <span className="rounded-full bg-teal-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-teal-200">
                  {profileSummary.employmentStatus.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">{email}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                {profileSummary.employeeId && (
                  <span className="rounded-lg bg-white/10 px-2 py-0.5 font-mono">{profileSummary.employeeId}</span>
                )}
                {profileSummary.designation && (
                  <span className="rounded-lg bg-white/10 px-2 py-0.5">{profileSummary.designation}</span>
                )}
                {profileSummary.departmentName && (
                  <span className="rounded-lg bg-white/10 px-2 py-0.5">{profileSummary.departmentName}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/faculty/profile"
              prefetch={true}
              className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              My Profile
            </Link>
            <Link
              href="/faculty/cv"
              prefetch={true}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-teal-400"
            >
              <FileText size={14} /> Academic CV
            </Link>
          </div>
        </div>
      </section>

      {/* Portfolio Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/faculty/research"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Publications &amp; Patents</span>
            <span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <FlaskConical size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{counts.publications + counts.patents}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            {counts.publications} publications, {counts.patents} patents &rarr;
          </p>
        </Link>

        <Link
          href="/faculty/development"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-teal-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">FDPs &amp; Certifications</span>
            <span className="rounded-xl bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
              <FileBadge size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{counts.fdps + counts.certifications}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-teal-600">
            {counts.fdps} programs, {counts.certifications} certs &rarr;
          </p>
        </Link>

        <Link
          href="/faculty/experience"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Teaching Workload</span>
            <span className="rounded-xl bg-slate-500/10 p-2 text-slate-700 dark:text-slate-300">
              <Layers size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{counts.teachingLoads}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            {counts.experiences} experience records &rarr;
          </p>
        </Link>

        <Link
          href="/faculty/consultancy"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-teal-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Grants &amp; Consultancy</span>
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Briefcase size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{counts.grants + counts.consultancies}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-teal-600">
            {counts.grants} grants, {counts.consultancies} consultancy &rarr;
          </p>
        </Link>
      </div>

      {/* Mandatory vs Optional Completeness */}
      <div className="grid gap-6 lg:grid-cols-2">
        {mandatory && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Mandatory Academic Profile</h3>
                <p className="text-xs text-muted-foreground">Core identity, qualifications, and teaching history.</p>
              </div>
              <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {mandatory.percentage}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${mandatory.percentage}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {mandatory.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2">
                    {item.complete ? <CheckCircle2 size={14} className="text-teal-600" /> : <Circle size={14} className="text-muted-foreground" />}
                    <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                  </span>
                  {item.href && !item.complete && (
                    <Link href={item.href} prefetch={true} className="font-medium text-indigo-600 hover:underline">
                      Complete &rarr;
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {optional && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Research, Development &amp; Outreach</h3>
                <p className="text-xs text-muted-foreground">FDPs, publications, grants, consultancy, and contributions.</p>
              </div>
              <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                {optional.percentage}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${optional.percentage}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {optional.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2">
                    {item.complete ? <CheckCircle2 size={14} className="text-teal-600" /> : <Circle size={14} className="text-muted-foreground" />}
                    <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                  </span>
                  {item.href && (
                    <Link href={item.href} prefetch={true} className="font-medium text-teal-600 hover:underline">
                      {item.complete ? 'View' : 'Add'} &rarr;
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Actionable Notifications + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={17} className="text-teal-600" />
              <h3 className="text-sm font-semibold text-foreground">Notifications &amp; Review Feedback</h3>
              {actionRequiredCount > 0 && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
                  {actionRequiredCount} action needed
                </span>
              )}
            </div>
            <Link href="/faculty/notifications" prefetch={true} className="text-xs font-medium text-indigo-600 hover:underline">
              View all &rarr;
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              All clear! No pending notifications.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {notifications.slice(0, 4).map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  prefetch={true}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-indigo-500/40"
                >
                  <div className="flex items-start gap-2.5">
                    {n.severity === 'action_required' ? (
                      <AlertCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
                    ) : n.severity === 'success' ? (
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-teal-600" />
                    ) : (
                      <Bell size={15} className="mt-0.5 shrink-0 text-indigo-600" />
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

        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
          <Link href="/faculty/contributions" prefetch={true} className="flex items-center justify-between rounded-xl border border-border p-3 text-xs font-medium hover:bg-muted">
            <span className="inline-flex items-center gap-2"><Award size={14} className="text-indigo-600" /> Contributions ({counts.contributions})</span>
            <span>&rarr;</span>
          </Link>
          <Link href="/faculty/documents" prefetch={true} className="flex items-center justify-between rounded-xl border border-border p-3 text-xs font-medium hover:bg-muted">
            <span className="inline-flex items-center gap-2"><FolderOpen size={14} className="text-teal-600" /> My Documents ({counts.documents})</span>
            <span>&rarr;</span>
          </Link>
          <Link href="/faculty/courses" prefetch={true} className="flex items-center justify-between rounded-xl border border-border p-3 text-xs font-medium hover:bg-muted">
            <span className="inline-flex items-center gap-2"><BookOpen size={14} className="text-indigo-600" /> Institutional Courses</span>
            <span>&rarr;</span>
          </Link>
        </section>
      </div>
    </div>
  )
}
