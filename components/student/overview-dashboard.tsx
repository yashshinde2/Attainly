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
  FileText,
  FolderOpen,
  Layers,
  TrendingUp,
} from 'lucide-react'
import type { StudentOverviewData } from '@/lib/server/services/student-overview'
import { VerificationBadge } from './shared-ui'

export function StudentOverviewDashboard({
  studentName,
  email,
  data,
}: {
  studentName: string
  email: string
  data: StudentOverviewData
}) {
  const { profileSummary, completeness, counts, semesters, recentActivity, notifications } = data
  const latestSem = semesters.length > 0 ? semesters[semesters.length - 1] : null
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
                alt={studentName}
                className="h-16 w-16 rounded-2xl border-2 border-teal-400/50 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/30 text-xl font-bold text-teal-300">
                {studentName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{studentName}</h2>
                <span className="rounded-full bg-teal-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-teal-200">
                  {profileSummary.academicStatus}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">{email}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                {profileSummary.enrollmentNumber && (
                  <span className="rounded-lg bg-white/10 px-2 py-0.5 font-mono">
                    {profileSummary.enrollmentNumber}
                  </span>
                )}
                {profileSummary.departmentName && (
                  <span className="rounded-lg bg-white/10 px-2 py-0.5">{profileSummary.departmentName}</span>
                )}
                {profileSummary.currentSemester && (
                  <span className="rounded-lg bg-white/10 px-2 py-0.5">
                    Semester {profileSummary.currentSemester}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/student/profile"
              prefetch={true}
              className="rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              My Profile
            </Link>
            <Link
              href="/student/resume"
              prefetch={true}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-teal-400"
            >
              <FileText size={14} /> Resume Builder
            </Link>
          </div>
        </div>
      </section>

      {/* Key Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/student/academics"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Current CGPA</span>
            <span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
              <BookOpen size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {latestSem ? latestSem.cgpaAtSemester.toFixed(2) : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            {semesters.length} {semesters.length === 1 ? 'semester' : 'semesters'} recorded &rarr;
          </p>
        </Link>

        <Link
          href="/student/achievements"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-teal-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Verified Achievements</span>
            <span className="rounded-xl bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
              <Award size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {counts.verifiedAchievements} <span className="text-sm font-normal text-muted-foreground">/ {counts.achievements}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-teal-600">
            Manage achievements &rarr;
          </p>
        </Link>

        <Link
          href="/student/projects"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Projects &amp; Internships</span>
            <span className="rounded-xl bg-slate-500/10 p-2 text-slate-700 dark:text-slate-300">
              <Layers size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{counts.projects + counts.internships}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            {counts.projects} projects, {counts.internships} internships &rarr;
          </p>
        </Link>

        <Link
          href="/student/career"
          prefetch={true}
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-teal-500/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Placement Offers</span>
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <Briefcase size={17} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{counts.placementOffers}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-teal-600">
            Career &amp; graduate outcomes &rarr;
          </p>
        </Link>
      </div>

      {/* Mandatory vs Optional Profile Completeness Checklists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {mandatory && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Mandatory Profile Completeness</h3>
                <p className="text-xs text-muted-foreground">
                  Core academic &amp; identity records required for institutional verification.
                </p>
              </div>
              <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                {mandatory.percentage}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${mandatory.percentage}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2">
              {mandatory.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 size={14} className="text-teal-600" />
                    ) : (
                      <Circle size={14} className="text-muted-foreground" />
                    )}
                    <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
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
                <h3 className="text-sm font-semibold text-foreground">Optional Achievements &amp; Engagement</h3>
                <p className="text-xs text-muted-foreground">
                  Co-curricular, research, and career milestones that strengthen your portfolio.
                </p>
              </div>
              <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">
                {optional.percentage}%
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-500"
                style={{ width: `${optional.percentage}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2">
              {optional.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2">
                    {item.complete ? (
                      <CheckCircle2 size={14} className="text-teal-600" />
                    ) : (
                      <Circle size={14} className="text-muted-foreground" />
                    )}
                    <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
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

      {/* Academic Performance Chart + Actionable Notifications */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={17} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-foreground">Academic Performance Progression</h3>
            </div>
            <Link href="/student/academics" prefetch={true} className="text-xs font-medium text-indigo-600 hover:underline">
              Full details &rarr;
            </Link>
          </div>
          {semesters.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No semester grades recorded yet. Add your semester SGPA/CGPA in Academics.
            </div>
          ) : (
            <div className="mt-5 flex items-end gap-3 overflow-x-auto pb-2" style={{ minHeight: '160px' }}>
              {semesters.map((sem) => {
                const heightPct = Math.max(12, Math.min(100, (sem.sgpa / 10) * 100))
                return (
                  <div key={sem.semesterNumber} className="flex min-w-[52px] flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                      {sem.sgpa.toFixed(2)}
                    </span>
                    <div className="flex h-28 w-full items-end justify-center rounded-lg bg-muted/40 p-1">
                      <div
                        className="w-full max-w-[28px] rounded-md bg-gradient-to-t from-indigo-600 to-teal-500 transition-all"
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

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={17} className="text-teal-600" />
              <h3 className="text-sm font-semibold text-foreground">Actionable Notifications</h3>
              {actionRequiredCount > 0 && (
                <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
                  {actionRequiredCount} action needed
                </span>
              )}
            </div>
            <Link href="/student/notifications" prefetch={true} className="text-xs font-medium text-indigo-600 hover:underline">
              View all &rarr;
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              You are all caught up! No pending notifications.
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
      </div>

      {/* Recent Activity & Quick Document Access */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">No recent submissions yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {recentActivity.map((act) => (
                <Link
                  key={act.id}
                  href={act.href}
                  prefetch={true}
                  className="flex items-center justify-between py-2.5 text-xs transition hover:bg-muted/30"
                >
                  <div>
                    <span className="font-semibold text-foreground">{act.title}</span>
                    <span className="ml-2 text-muted-foreground">&bull; {act.type}</span>
                  </div>
                  <VerificationBadge status={act.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <FolderOpen size={17} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-foreground">Document Library</h3>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {counts.documents} {counts.documents === 1 ? 'document' : 'documents'} stored securely in your institutional vault.
          </p>
          <Link
            href="/student/documents"
            prefetch={true}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            Open My Documents &rarr;
          </Link>
        </section>
      </div>
    </div>
  )
}
