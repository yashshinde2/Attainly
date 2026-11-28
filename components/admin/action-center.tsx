'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileWarning,
  Play,
  Plus,
  Send,
  Trash2,
  UserCheck,
} from 'lucide-react'

interface ActionCenterData {
  summary: {
    assignedTasks: number
    overdueRequests: number
    pendingCorrections: number
    upcomingEvents: number
    dataQualityIssues: number
    missingEnrollmentCount: number
    missingEmployeeIdCount: number
  }
  assignedItems: Array<{
    id: string
    itemType: string
    itemId: string
    updatedAt: string | Date
  }>
  overdueRequests: Array<{
    id: string
    title: string
    targetType: string
    dueDate: string | Date | null
    reminderCount: number
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    startsAt: string | Date
    status: string
    department: { code: string }
    _count: { participation: number }
  }>
  savedReports: Array<{
    id: string
    name: string
    entityType: string
    createdAt: string | Date
  }>
  assignmentRules: Array<{
    id: string
    departmentId: string | null
    itemType: string
    reviewerUserId: string
    priority: number
    isActive: boolean
  }>
  campaignTemplates: Array<{
    id: string
    name: string
    title: string
    description: string | null
    targetType: string
    requireEvidence: boolean
    defaultDueDays: number
  }>
  reminderRules: Array<{
    id: string
    name: string
    targetScope: string
    daysBeforeDue: number
    lastRunAt: string | Date | null
    lastNotifiedCount: number
  }>
  recentAuditLogs: Array<{
    id: string
    itemType: string
    itemId: string
    action: string
    comment: string | null
    createdAt: string | Date
  }>
  departments: Array<{ id: string; code: string; name: string }>
  reviewers: Array<{ id: string; name: string; email: string }>
}

type TabKey = 'inbox' | 'rules' | 'campaigns' | 'reminders' | 'activity'

export function AdminActionCenter({ data }: { data: ActionCenterData }) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('inbox')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Rule form
  const [ruleDeptId, setRuleDeptId] = useState('')
  const [ruleItemType, setRuleItemType] = useState('ALL')
  const [ruleReviewerId, setRuleReviewerId] = useState(data.reviewers[0]?.id ?? '')

  // Campaign template form
  const [tplName, setTplName] = useState('')
  const [tplTitle, setTplTitle] = useState('')
  const [tplDesc, setTplDesc] = useState('')
  const [tplTargetType, setTplTargetType] = useState('DOCUMENT')
  const [tplDueDays, setTplDueDays] = useState('7')
  const [tplRequireEvidence, setTplRequireEvidence] = useState(true)
  const [launchRole, setLaunchRole] = useState<'STUDENT' | 'FACULTY'>('STUDENT')
  const [launchDeptId, setLaunchDeptId] = useState('')

  // Reminder rule form
  const [remName, setRemName] = useState('')
  const [remDays, setRemDays] = useState('2')

  const deptNameById = new Map(data.departments.map((d) => [d.id, `${d.code} — ${d.name}`]))
  const reviewerNameById = new Map(data.reviewers.map((r) => [r.id, r.name]))

  const postAction = async (payload: Record<string, unknown>, successMsg: string) => {
    setBusy(true)
    setError(null)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/action-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Operation failed.')
      setFeedback(successMsg)
      router.refresh()
      return json
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.')
      return null
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Administrative Productivity
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Action Center &amp; Smart Workflows
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Triage assigned verifications, overdue data requests, reviewer assignment rules, campaign templates, and deadline reminders.
          </p>
        </div>
        <Link
          href="/admin/verifications"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <ClipboardCheck size={14} /> Open Bulk Verification Queue
        </Link>
      </header>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] text-muted-foreground">Assigned to Me</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{data.summary.assignedTasks}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] text-muted-foreground">Overdue Requests</p>
          <p className="mt-1 text-2xl font-bold text-destructive">{data.summary.overdueRequests}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] text-muted-foreground">Pending Corrections</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{data.summary.pendingCorrections}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] text-muted-foreground">Active Events</p>
          <p className="mt-1 text-2xl font-bold text-primary">{data.summary.upcomingEvents}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <p className="text-[11px] text-muted-foreground">Data-Quality Flags</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{data.summary.dataQualityIssues}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {(
          [
            ['inbox', 'Action Inbox'],
            ['rules', `Reviewer Rules (${data.assignmentRules.length})`],
            ['campaigns', `Campaign Templates (${data.campaignTemplates.length})`],
            ['reminders', `Deadline Reminders (${data.reminderRules.length})`],
            ['activity', 'Activity History'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k)
              setError(null)
              setFeedback(null)
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              tab === k
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
      {feedback && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          {feedback}
        </div>
      )}

      {/* TAB 1: ACTION INBOX */}
      {tab === 'inbox' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Assigned Verifications ({data.summary.assignedTasks})</h2>
              <Link href="/admin/verifications" className="text-xs font-semibold text-primary hover:underline">
                Review All →
              </Link>
            </div>
            {data.assignedItems.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No verification tasks currently assigned to you.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-xs">
                {data.assignedItems.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2.5">
                    <span className="font-medium">{a.itemType.replace(/_/g, ' ')} ({a.itemId.slice(0, 8)}…)</span>
                    <Link href="/admin/verifications" className="text-primary hover:underline">Open</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Overdue Data Requests ({data.summary.overdueRequests})</h2>
              <button
                type="button"
                disabled={busy}
                onClick={() => postAction({ action: 'run_reminders' }, 'Durable reminders dispatched for due/overdue requests.')}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-muted"
              >
                <BellRing size={12} /> Send Reminders
              </button>
            </div>
            {data.overdueRequests.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No overdue data collection requests.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-xs">
                {data.overdueRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-[11px] text-destructive">
                        Due {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'} · Reminders sent: {r.reminderCount}
                      </p>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      OVERDUE
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Saved Report Templates ({data.savedReports.length})</h2>
              <Link href="/admin/reports" className="text-xs font-semibold text-primary hover:underline">
                Report Studio →
              </Link>
            </div>
            {data.savedReports.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No saved report templates yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-xs">
                {data.savedReports.map((sr) => (
                  <li key={sr.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-semibold">{sr.name}</p>
                      <p className="text-[11px] text-muted-foreground">{sr.entityType}</p>
                    </div>
                    <Link
                      href={`/admin/reports?entityType=${encodeURIComponent(sr.entityType)}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-semibold text-primary hover:bg-primary/20"
                    >
                      <BarChart3 size={12} /> Re-run
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Event Responsibilities &amp; Data Quality</h2>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <span className="flex items-center gap-2">
                  <FileWarning size={14} className="text-amber-600" />
                  Students missing Enrollment Number
                </span>
                <Link href="/admin/students" className="font-semibold text-primary hover:underline">
                  {data.summary.missingEnrollmentCount} →
                </Link>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  Faculty missing Employee ID
                </span>
                <Link href="/admin/faculty" className="font-semibold text-primary hover:underline">
                  {data.summary.missingEmployeeIdCount} →
                </Link>
              </div>
              {data.upcomingEvents.slice(0, 3).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <div>
                    <p className="font-semibold">{ev.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ev.department.code} · {new Date(ev.startsAt).toLocaleDateString()} · {ev._count.participation} participants
                    </p>
                  </div>
                  <Link href="/admin/events" className="text-primary hover:underline">Manage</Link>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: REVIEWER ASSIGNMENT RULES */}
      {tab === 'rules' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-5">
            <h2 className="text-sm font-semibold">Create Department Reviewer Rule</h2>
            <div>
              <label htmlFor="ruleDept" className="text-xs font-semibold">Department Scope</label>
              <select id="ruleDept" value={ruleDeptId} onChange={(e) => setRuleDeptId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs">
                <option value="">All Departments (Fallback)</option>
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ruleItemType" className="text-xs font-semibold">Record Type</label>
              <select id="ruleItemType" value={ruleItemType} onChange={(e) => setRuleItemType(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs">
                <option value="ALL">All Verifiable Types</option>
                <option value="ACHIEVEMENT">Student Achievements</option>
                <option value="CERTIFICATION">Student Certifications</option>
                <option value="INTERNSHIP">Student Internships</option>
                <option value="FACULTY_FDP">Faculty FDPs</option>
                <option value="CANONICAL_PUBLICATION">Research Publications</option>
              </select>
            </div>
            <div>
              <label htmlFor="ruleReviewer" className="text-xs font-semibold">Assign To Reviewer</label>
              <select id="ruleReviewer" value={ruleReviewerId} onChange={(e) => setRuleReviewerId(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs">
                {data.reviewers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !ruleReviewerId}
              onClick={() =>
                postAction(
                  { action: 'create_rule', departmentId: ruleDeptId || null, itemType: ruleItemType, reviewerUserId: ruleReviewerId },
                  'Reviewer assignment rule saved.',
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Plus size={14} /> Save Rule
            </button>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
            <h2 className="text-sm font-semibold">Configured Assignment Rules</h2>
            {data.assignmentRules.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No department assignment rules configured yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-xs">
                {data.assignmentRules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-semibold">
                        {r.departmentId ? deptNameById.get(r.departmentId) ?? r.departmentId : 'All Departments'} · {r.itemType}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Assigned to: {reviewerNameById.get(r.reviewerUserId) ?? r.reviewerUserId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => postAction({ action: 'delete_rule', ruleId: r.id }, 'Rule deleted.')}
                      className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: CAMPAIGN TEMPLATES */}
      {tab === 'campaigns' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-5">
            <h2 className="text-sm font-semibold">Save Data Collection Template</h2>
            <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="Template Name (e.g. Annual NAAC FDP Drive)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <input value={tplTitle} onChange={(e) => setTplTitle(e.target.value)} placeholder="Request Title shown to recipients" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <textarea value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} placeholder="Instructions..." rows={2} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <select value={tplTargetType} onChange={(e) => setTplTargetType(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2 text-xs">
                <option value="DOCUMENT">Document</option>
                <option value="ACHIEVEMENT">Achievement</option>
                <option value="CERTIFICATION">Certification</option>
                <option value="FACULTY_FDP">Faculty FDP</option>
                <option value="FACULTY_RESEARCH">Faculty Research</option>
              </select>
              <input type="number" min={1} max={180} value={tplDueDays} onChange={(e) => setTplDueDays(e.target.value)} placeholder="Due days" className="rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={tplRequireEvidence} onChange={(e) => setTplRequireEvidence(e.target.checked)} />
              Require supporting evidence document
            </label>
            <button
              type="button"
              disabled={busy || !tplName || !tplTitle}
              onClick={() =>
                postAction(
                  {
                    action: 'create_template',
                    name: tplName,
                    title: tplTitle,
                    description: tplDesc,
                    targetType: tplTargetType,
                    defaultDueDays: Number(tplDueDays),
                    requireEvidence: tplRequireEvidence,
                  },
                  'Campaign template saved.',
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus size={14} /> Save Template
            </button>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Saved Templates — 1-Click Launch</h2>
              <div className="flex gap-2">
                <select value={launchRole} onChange={(e) => setLaunchRole(e.target.value as 'STUDENT' | 'FACULTY')} className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs">
                  <option value="STUDENT">Target: Students</option>
                  <option value="FACULTY">Target: Faculty</option>
                </select>
                <select value={launchDeptId} onChange={(e) => setLaunchDeptId(e.target.value)} className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs">
                  <option value="">All Departments</option>
                  {data.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.code}</option>
                  ))}
                </select>
              </div>
            </div>
            {data.campaignTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground">No campaign templates saved yet.</p>
            ) : (
              <ul className="divide-y divide-border text-xs">
                {data.campaignTemplates.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.targetType} · Due in {t.defaultDueDays}d {t.requireEvidence ? '· Evidence required' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          const r = await postAction(
                            { action: 'launch_template', templateId: t.id, targetRole: launchRole, departmentId: launchDeptId || null },
                            'Campaign launched.',
                          )
                          if (r?.createdCount !== undefined) {
                            setFeedback(`Launched "${t.name}" to ${r.createdCount} recipient(s).`)
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                      >
                        <Send size={12} /> Launch
                      </button>
                      <button
                        type="button"
                        onClick={() => postAction({ action: 'delete_template', templateId: t.id }, 'Template deleted.')}
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: DEADLINE REMINDERS */}
      {tab === 'reminders' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-5">
            <h2 className="text-sm font-semibold">Configure Deadline Reminder Rule</h2>
            <input value={remName} onChange={(e) => setRemName(e.target.value)} placeholder="Rule Name (e.g. 48h Before Due Date)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <div>
              <label htmlFor="remDays" className="text-xs font-semibold">Days Before Due Date</label>
              <input id="remDays" type="number" min={0} max={30} value={remDays} onChange={(e) => setRemDays(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !remName}
                onClick={() => postAction({ action: 'create_reminder_rule', name: remName, daysBeforeDue: Number(remDays) }, 'Reminder rule created.')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Plus size={14} /> Save Rule
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const r = await postAction({ action: 'run_reminders' }, 'Reminders executed.')
                  if (r) setFeedback(`Processed ${r.rulesProcessed} rule(s); dispatched ${r.remindersDispatched} reminder(s).`)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold hover:bg-muted"
              >
                <Play size={13} /> Run Now
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
            <h2 className="text-sm font-semibold">Active Reminder Schedules</h2>
            {data.reminderRules.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No reminder rules configured yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-xs">
                {data.reminderRules.map((rr) => (
                  <li key={rr.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-semibold">{rr.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {rr.daysBeforeDue}d before due · Last run:{' '}
                        {rr.lastRunAt ? `${new Date(rr.lastRunAt).toLocaleString()} (${rr.lastNotifiedCount} notified)` : 'Never'}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      ACTIVE
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* TAB 5: ACTIVITY HISTORY */}
      {tab === 'activity' && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Recent Administrative Activity &amp; Audit History</h2>
          <ul className="mt-3 divide-y divide-border text-xs">
            {data.recentAuditLogs.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <span className="font-semibold">{log.action}</span> · {log.itemType} ({log.itemId.slice(0, 8)}…)
                  {log.comment && <p className="text-[11px] text-muted-foreground">{log.comment}</p>}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
