'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Award,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileWarning,
  FlaskConical,
  GraduationCap,
  UsersRound,
} from 'lucide-react'
import type { AdminCommandOverview } from '@/lib/server/services/admin-command'
import type { AdminAttentionInsights } from '@/lib/server/services/reports'
import type { AcademicYear } from '@/generated/prisma/client'
import type { DepartmentWithCourseCount } from '@/lib/server/repositories/department-repository'

export function AdminCommandOverviewClient({
  overview,
  attentionInsights,
  departments,
  academicYears,
  selectedDepartmentId,
  selectedAcademicYear,
}: {
  overview: AdminCommandOverview
  attentionInsights: AdminAttentionInsights
  departments: DepartmentWithCourseCount[]
  academicYears: AcademicYear[]
  selectedDepartmentId?: string
  selectedAcademicYear?: string
}) {
  const router = useRouter()

  const applyFilter = (deptId: string, ayLabel: string) => {
    const params = new URLSearchParams()
    if (deptId) params.set('departmentId', deptId)
    if (ayLabel) params.set('academicYear', ayLabel)
    const qs = params.toString()
    router.push(qs ? `/admin?${qs}` : '/admin')
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Command Filters */}
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="cmd-dept" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Department Scope
            </label>
            <select
              id="cmd-dept"
              value={selectedDepartmentId ?? ''}
              onChange={(e) => applyFilter(e.target.value, selectedAcademicYear ?? '')}
              className="mt-1 block rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cmd-ay" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Academic Year
            </label>
            <select
              id="cmd-ay"
              value={selectedAcademicYear ?? ''}
              onChange={(e) => applyFilter(selectedDepartmentId ?? '', e.target.value)}
              className="mt-1 block rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.label}>
                  {ay.label} {ay.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/verifications"
            prefetch={true}
            className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Verification Center ({overview.pendingVerificationsCount})
          </Link>
          <Link
            href="/admin/reports"
            prefetch={true}
            className="rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted"
          >
            Institutional Reports &rarr;
          </Link>
        </div>
      </section>

      {/* Primary KPI Grid (Every card links to its detailed view/report) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/students" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Students</span>
            <span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600"><GraduationCap size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">{overview.studentCount}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            Engaged: {overview.studentEngagementCount} &bull; Directory &rarr;
          </p>
        </Link>

        <Link href="/admin/faculty" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-teal-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Faculty</span>
            <span className="rounded-xl bg-teal-500/10 p-2 text-teal-600"><UsersRound size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">{overview.facultyCount}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-teal-600">
            {overview.departmentCount} depts, {overview.courseCount} courses &rarr;
          </p>
        </Link>

        <Link href="/admin/verifications" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-amber-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pending Verifications</span>
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600"><Clock size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">{overview.pendingVerificationsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-amber-600">
            {overview.overdueVerificationsCount} overdue (&gt;7d) &bull; Review &rarr;
          </p>
        </Link>

        <Link href="/admin/reports?type=ACHIEVEMENTS" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-teal-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Verified Records</span>
            <span className="rounded-xl bg-teal-500/10 p-2 text-teal-600"><CheckCircle2 size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">{overview.verifiedRecordsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-teal-600">
            Accreditation-ready &rarr;
          </p>
        </Link>

        <Link href="/admin/reports?type=CERT_RESEARCH_PATENT" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Research Contributions</span>
            <span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600"><FlaskConical size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">{overview.researchContributionsCount}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            Papers, grants &amp; patents &rarr;
          </p>
        </Link>

        <Link href="/admin/students?placementStatus=HAS_OFFERS" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-teal-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Placement Outcomes</span>
            <span className="rounded-xl bg-teal-500/10 p-2 text-teal-600"><Briefcase size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">{overview.placementOutcomes.placedOutcomeCount}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-teal-600">
            {overview.placementOutcomes.totalOffers} offers &bull; {overview.placementOutcomes.higherStudiesCount} higher studies &rarr;
          </p>
        </Link>

        <Link href="/admin/events" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-indigo-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Campus Events</span>
            <span className="rounded-xl bg-indigo-500/10 p-2 text-indigo-600"><CalendarDays size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">{overview.eventStats.totalEvents}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            {overview.eventStats.totalParticipations} participations &rarr;
          </p>
        </Link>

        <Link href="/admin/reports?type=COMPLETENESS_LAGGARDS" prefetch={true} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-amber-500/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Profile Completeness</span>
            <span className="rounded-xl bg-slate-500/10 p-2 text-slate-700 dark:text-slate-300"><Award size={17} /></span>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {overview.profileCompleteness.studentAvgPct}% <span className="text-sm font-normal text-muted-foreground">Student</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600">
            Faculty avg: {overview.profileCompleteness.facultyAvgPct}% &bull; Laggards &rarr;
          </p>
        </Link>
      </div>

      {/* Needs Attention & Missing Evidence Strip */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <AlertTriangle size={14} className="text-amber-600" /> Needs Attention &amp; Compliance Signals
          </h2>
          <Link href="/admin/departments" prefetch={true} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline">
            <BookOpen size={13} /> Manage Departments
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/verifications?overdueOnly=1" prefetch={true} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 hover:border-indigo-500/50">
            <div>
              <p className="text-xs text-muted-foreground">Pending &gt; 7 days</p>
              <p className="mt-0.5 text-lg font-bold">{attentionInsights.pendingOver7DaysCount}</p>
            </div>
            <span className="text-xs font-medium text-indigo-600">Review &rarr;</span>
          </Link>
          <Link href="/admin/reports?type=COMPLETENESS_LAGGARDS" prefetch={true} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 hover:border-indigo-500/50">
            <div>
              <p className="text-xs text-muted-foreground">Depts &lt; 50% completeness</p>
              <p className="mt-0.5 text-lg font-bold">{attentionInsights.departmentsBelow50Count}</p>
            </div>
            <span className="text-xs font-medium text-indigo-600">Inspect &rarr;</span>
          </Link>
          <Link href="/admin/reports?type=CRITERION_COVERAGE" prefetch={true} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 hover:border-indigo-500/50">
            <div>
              <p className="text-xs text-muted-foreground">Zero-coverage criteria</p>
              <p className="mt-0.5 text-lg font-bold">{attentionInsights.zeroCoverageCriteriaCount}</p>
            </div>
            <span className="text-xs font-medium text-indigo-600">Gaps &rarr;</span>
          </Link>
          <Link href="/admin/reports?type=CERT_RESEARCH_PATENT" prefetch={true} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 hover:border-amber-500/50">
            <div>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><FileWarning size={12} /> Missing evidence</p>
              <p className="mt-0.5 text-lg font-bold">{overview.missingEvidenceCount}</p>
            </div>
            <span className="text-xs font-medium text-amber-600">Audit &rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
