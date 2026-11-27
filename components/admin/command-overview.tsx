'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Award,
  BarChart3,
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
import { KpiCard, PageHeader, SectionHeader } from '@/components/shared/attainly-ui'

const FREQUENT_REPORTS = [
  { label: 'Student Achievements', href: '/admin/reports?type=ACHIEVEMENTS' },
  { label: 'Placement Outcomes', href: '/admin/reports?type=PLACEMENTS' },
  { label: 'Research Publications', href: '/admin/reports?type=RESEARCH_PUBLICATIONS' },
  { label: 'Campus Events', href: '/admin/reports?type=EVENTS' },
  { label: 'Data Quality Audit', href: '/admin/reports?type=DATA_QUALITY' },
]

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Institution Governance"
        title="Admin Command Center"
        description="Real-time institutional metrics, verification workload, compliance signals, and accreditation-ready reporting."
        badge={selectedAcademicYear ? `AY ${selectedAcademicYear}` : 'All Academic Years'}
        actions={
          <>
            <Link
              href="/admin/verifications"
              prefetch={false}
              className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Verification Center ({overview.pendingVerificationsCount})
            </Link>
            <Link
              href="/admin/reports"
              prefetch={false}
              className="rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              Report Studio &rarr;
            </Link>
          </>
        }
      />

      {/* Command Filters */}
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="cmd-dept" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Department Scope
            </label>
            <select
              id="cmd-dept"
              value={selectedDepartmentId ?? ''}
              onChange={(e) => applyFilter(e.target.value, selectedAcademicYear ?? '')}
              className="mt-1 block rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
            <label htmlFor="cmd-ay" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Academic Year
            </label>
            <select
              id="cmd-ay"
              value={selectedAcademicYear ?? ''}
              onChange={(e) => applyFilter(selectedDepartmentId ?? '', e.target.value)}
              className="mt-1 block rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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

        {(selectedDepartmentId || selectedAcademicYear) && (
          <button
            type="button"
            onClick={() => applyFilter('', '')}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Reset Filters
          </button>
        )}
      </section>

      {/* Primary KPI Grid (Every card links to its detailed view/report) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Students (Exact)"
          value={overview.studentCount}
          subtitle={`Engaged: ${overview.studentEngagementCount} · Directory`}
          icon={GraduationCap}
          href="/admin/students"
        />
        <KpiCard
          label="Faculty (Exact)"
          value={overview.facultyCount}
          subtitle={`${overview.departmentCount} depts · ${overview.courseCount} courses`}
          icon={UsersRound}
          href="/admin/faculty"
        />
        <KpiCard
          label="Pending Verifications"
          value={overview.pendingVerificationsCount}
          subtitle={`${overview.overdueVerificationsCount} overdue (>7d)`}
          icon={Clock}
          href="/admin/verifications"
        />
        <KpiCard
          label="Verified Records"
          value={overview.verifiedRecordsCount}
          subtitle="Accreditation-ready records"
          icon={CheckCircle2}
          href="/admin/reports?type=ACHIEVEMENTS"
        />
        <KpiCard
          label="Research Contributions"
          value={overview.researchContributionsCount}
          subtitle="Papers, grants & patents"
          icon={FlaskConical}
          href="/admin/reports?type=CERT_RESEARCH_PATENT"
        />
        <KpiCard
          label="Placement Outcomes"
          value={overview.placementOutcomes.placedOutcomeCount}
          subtitle={`${overview.placementOutcomes.totalOffers} offers · ${overview.placementOutcomes.higherStudiesCount} higher studies`}
          icon={Briefcase}
          href="/admin/students?placementStatus=HAS_OFFERS"
        />
        <KpiCard
          label="Campus Events"
          value={overview.eventStats.totalEvents}
          subtitle={`${overview.eventStats.totalParticipations} participations`}
          icon={CalendarDays}
          href="/admin/events"
        />
        <KpiCard
          label="Profile Completeness (Sampled)"
          value={`${overview.profileCompleteness.studentAvgPct}%`}
          subtitle={`Faculty avg: ${overview.profileCompleteness.facultyAvgPct}% (250-profile sample)`}
          icon={Award}
          href="/admin/reports?type=COMPLETENESS_LAGGARDS"
        />
      </div>

      {/* Needs Attention & Missing Evidence Strip */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <SectionHeader
          title="Needs Attention & Compliance Signals"
          description="Actionable verification delays, completeness gaps, and missing evidence records."
          actions={
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--status-pending)]">
              <AlertTriangle size={14} /> Priority Signals
            </span>
          }
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/verifications?overdueOnly=1" prefetch={false} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary/40">
            <div>
              <p className="text-xs text-muted-foreground">Pending &gt; 7 days</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{attentionInsights.pendingOver7DaysCount}</p>
            </div>
            <span className="text-xs font-semibold text-primary">Review &rarr;</span>
          </Link>
          <Link href="/admin/reports?type=COMPLETENESS_LAGGARDS" prefetch={false} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary/40">
            <div>
              <p className="text-xs text-muted-foreground">Depts &lt; 50% completeness</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{attentionInsights.departmentsBelow50Count}</p>
            </div>
            <span className="text-xs font-semibold text-primary">Inspect &rarr;</span>
          </Link>
          <Link href="/admin/reports?type=CRITERION_COVERAGE" prefetch={false} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary/40">
            <div>
              <p className="text-xs text-muted-foreground">Zero-coverage criteria</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{attentionInsights.zeroCoverageCriteriaCount}</p>
            </div>
            <span className="text-xs font-semibold text-primary">Gaps &rarr;</span>
          </Link>
          <Link href="/admin/reports?type=CERT_RESEARCH_PATENT" prefetch={false} className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary/40">
            <div>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><FileWarning size={12} /> Missing evidence</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{overview.missingEvidenceCount}</p>
            </div>
            <span className="text-xs font-semibold text-[var(--status-pending)]">Audit &rarr;</span>
          </Link>
        </div>
      </section>

      {/* Frequently Used Reports */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <SectionHeader
          title="Frequently Used Reports"
          description="Direct shortcuts to deterministic institutional & accreditation report presets."
          actions={
            <Link href="/admin/inspections" prefetch={false} className="text-xs font-semibold text-primary hover:underline">
              Inspection Packages &rarr;
            </Link>
          }
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {FREQUENT_REPORTS.map((rep) => (
            <Link
              key={rep.href}
              href={rep.href}
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-muted"
            >
              <BarChart3 size={13} className="text-primary" />
              {rep.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
