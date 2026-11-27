'use client'

import { useActionState, useMemo, useState } from 'react'
import {
  cancelEventRegistrationAction,
  registerForEventAction,
  type EventActionState,
} from '@/app/actions/events'
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  LayoutGrid,
  MapPin,
  Printer,
  ShieldCheck,
  Tag,
  Users,
  X,
} from 'lucide-react'

const initialState: EventActionState = { status: 'idle', message: '' }

export interface DiscoverableEventItem {
  id: string
  title: string
  description: string | null
  type: string
  categoryCode: string | null
  subcategory: string | null
  status: string
  venue: string | null
  mode: string
  level: string
  startsAt: Date | string
  endsAt: Date | string
  registrationDeadline: Date | string | null
  capacity: number | null
  allowTeamRegistration: boolean
  maxTeamSize: number | null
  supportingDocUrls: string[]
  certificateTemplateEnabled: boolean
  completionSummary: string | null
  department: { id: string; name: string; code: string }
  _count: { participation: number }
  myParticipation: {
    id: string
    role: string
    registrationStatus: string
    attendanceStatus: string
    teamName: string | null
    teamRole: string | null
    position: string | null
    certificateUrl: string | null
    certificateRef: string | null
    syncedAchievementId: string | null
    syncedContributionId: string | null
  } | null
  eligibility: { eligible: boolean; reason?: string }
}

export interface EventCategoryOption {
  id: string
  code: string
  label: string
  subcategories: string[]
  isActive: boolean
}

function CancelRegButton({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(cancelEventRegistrationAction, initialState)
  return (
    <form action={action} className="inline">
      <input type="hidden" name="eventId" value={eventId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {pending ? 'Cancelling…' : 'Cancel'}
      </button>
      {state.status === 'error' && <p className="mt-1 text-xs text-destructive">{state.message}</p>}
    </form>
  )
}

export function EventsCatalog({
  events,
  categories,
  portalRole,
  institutionName,
  institutionLogoUrl,
  participantName,
}: {
  events: DiscoverableEventItem[]
  categories: EventCategoryOption[]
  portalRole: 'student' | 'faculty'
  institutionName: string
  institutionLogoUrl: string | null
  participantName: string
}) {
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterTab, setFilterTab] = useState<'discover' | 'mine'>('discover')
  const [search, setSearch] = useState('')
  const [registerTarget, setRegisterTarget] = useState<DiscoverableEventItem | null>(null)
  const [certificateTarget, setCertificateTarget] = useState<DiscoverableEventItem | null>(null)
  const [regState, regAction, regPending] = useActionState(registerForEventAction, initialState)

  const categoryLabelMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) map.set(c.code, c.label)
    return map
  }, [categories])

  const myEvents = useMemo(
    () => events.filter((e) => e.myParticipation && e.myParticipation.registrationStatus !== 'CANCELLED'),
    [events],
  )

  const filtered = useMemo(() => {
    const source = filterTab === 'mine' ? myEvents : events
    return source.filter((evt) => {
      const catKey = evt.categoryCode ?? evt.type
      const matchesCat = filterCategory === 'ALL' || catKey === filterCategory
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        evt.department.name.toLowerCase().includes(q) ||
        (evt.venue && evt.venue.toLowerCase().includes(q)) ||
        (evt.description && evt.description.toLowerCase().includes(q))
      return matchesCat && matchesSearch
    })
  }, [events, myEvents, filterTab, filterCategory, search])

  const eventsByMonth = useMemo(() => {
    const groups = new Map<string, DiscoverableEventItem[]>()
    for (const evt of filtered) {
      const d = new Date(evt.startsAt)
      const key = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      const list = groups.get(key) ?? []
      list.push(evt)
      groups.set(key, list)
    }
    return Array.from(groups.entries())
  }, [filtered])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Campus Events &amp; Activities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Discover eligible events, register individually or as a team, track attendance, and download verified certificates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterTab('discover')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filterTab === 'discover'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('mine')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              filterTab === 'mine'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            My Registrations ({myEvents.length})
          </button>
        </div>
      </div>

      {/* Filter & View Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, venue, department…"
            className="w-64 rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium text-foreground outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              viewMode === 'cards' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <LayoutGrid size={13} />
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              viewMode === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <CalendarDays size={13} />
            Calendar
          </button>
        </div>
      </div>

      {/* Events Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <CalendarDays size={36} className="mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No events match your current filters</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing your search or switching category filters.</p>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="space-y-6">
          {eventsByMonth.map(([monthLabel, monthEvents]) => (
            <section key={monthLabel} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 text-base font-semibold text-foreground">{monthLabel}</h2>
              <div className="divide-y divide-border">
                {monthEvents.map((evt) => {
                  const start = new Date(evt.startsAt)
                  const reg = evt.myParticipation
                  const isActiveReg = reg && reg.registrationStatus !== 'CANCELLED'
                  return (
                    <div key={evt.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <span className="text-[10px] font-bold uppercase">
                            {start.toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          <span className="text-base font-bold leading-none">{start.getDate()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{evt.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {evt.department.code} &middot; {evt.mode} &middot; {evt.venue || 'Campus Venue'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActiveReg ? (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {reg.registrationStatus}
                          </span>
                        ) : evt.eligibility.eligible ? (
                          <button
                            type="button"
                            onClick={() => setRegisterTarget(evt)}
                            className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                          >
                            Register
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">{evt.eligibility.reason}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((evt) => {
            const startDate = new Date(evt.startsAt)
            const endDate = new Date(evt.endsAt)
            const catLabel = categoryLabelMap.get(evt.categoryCode ?? '') ?? evt.type.replaceAll('_', ' ')
            const reg = evt.myParticipation
            const isActiveReg = reg && reg.registrationStatus !== 'CANCELLED'
            const isConfirmed = reg && ['CONFIRMED', 'ATTENDED'].includes(reg.registrationStatus)
            const isSynced = Boolean(reg?.syncedAchievementId || reg?.syncedContributionId)

            return (
              <div
                key={evt.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                      {catLabel}{evt.subcategory ? ` • ${evt.subcategory}` : ''}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        evt.status === 'COMPLETED'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>

                  <h2 className="mt-3 text-base font-bold text-foreground line-clamp-2">{evt.title}</h2>
                  <p className="mt-1 text-xs font-medium text-primary">
                    {evt.department.name} ({evt.department.code}) &middot; {evt.level.replaceAll('_', ' ')}
                  </p>

                  {evt.description && (
                    <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {evt.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={13} className="shrink-0" />
                      <span>
                        {startDate.toLocaleDateString()} &ndash; {endDate.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="shrink-0" />
                      <span>
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {evt.registrationDeadline
                          ? ` • Reg closes ${new Date(evt.registrationDeadline).toLocaleDateString()}`
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="shrink-0" />
                      <span>
                        {evt.mode} {evt.venue ? `• ${evt.venue}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={13} className="shrink-0" />
                      <span>
                        {evt._count.participation}
                        {evt.capacity ? ` / ${evt.capacity}` : ''} registered
                        {evt.allowTeamRegistration ? ` • Teams up to ${evt.maxTeamSize ?? 4}` : ''}
                      </span>
                    </div>
                  </div>

                  {evt.supportingDocUrls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {evt.supportingDocUrls.map((url, idx) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-muted"
                        >
                          <FileText size={11} />
                          Brochure / Doc {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Registration / Confirmation Footer */}
                <div className="mt-4 border-t border-border pt-3">
                  {isActiveReg ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isConfirmed
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          <CheckCircle2 size={12} />
                          {isConfirmed ? `Confirmed (${reg.role})` : 'Registered (Pending Confirmation)'}
                        </span>
                        {reg.position && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <Award size={12} />
                            {reg.position}
                          </span>
                        )}
                      </div>

                      {reg.teamName && (
                        <p className="text-[11px] text-muted-foreground">
                          Team: <span className="font-medium text-foreground">{reg.teamName}</span> ({reg.teamRole ?? 'MEMBER'})
                        </p>
                      )}

                      {isSynced && (
                        <p className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                          <ShieldCheck size={12} />
                          Synced to {portalRole === 'student' ? 'Student Achievements' : 'Faculty Contributions'}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {!isConfirmed && evt.status === 'PUBLISHED' && <CancelRegButton eventId={evt.id} />}
                        {isConfirmed && (reg.certificateRef || reg.certificateUrl) && (
                          <button
                            type="button"
                            onClick={() => setCertificateTarget(evt)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                          >
                            <Award size={13} />
                            View Certificate
                          </button>
                        )}
                      </div>
                    </div>
                  ) : evt.eligibility.eligible ? (
                    <button
                      type="button"
                      onClick={() => setRegisterTarget(evt)}
                      className="w-full rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                    >
                      Register for Event
                    </button>
                  ) : (
                    <div className="rounded-xl bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
                      {evt.eligibility.reason}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Registration Modal */}
      {registerTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Register for ${registerTarget.title}`}
          onKeyDown={(e) => e.key === 'Escape' && setRegisterTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Register for Event</h3>
                <p className="mt-1 text-xs text-muted-foreground">{registerTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setRegisterTarget(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <form action={regAction} className="mt-4 space-y-4">
              <input type="hidden" name="eventId" value={registerTarget.id} />

              {registerTarget.allowTeamRegistration && (
                <div className="space-y-3 rounded-xl border border-border bg-background p-3.5">
                  <p className="text-xs font-semibold text-foreground">
                    Team Registration (optional, max {registerTarget.maxTeamSize ?? 4} members)
                  </p>
                  <div>
                    <label htmlFor="reg-team-name" className="text-xs font-medium text-foreground">
                      Team Name
                    </label>
                    <input
                      id="reg-team-name"
                      name="teamName"
                      maxLength={120}
                      placeholder="Leave blank for individual registration"
                      className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-team-role" className="text-xs font-medium text-foreground">
                      Team Role
                    </label>
                    <select
                      id="reg-team-role"
                      name="teamRole"
                      defaultValue="MEMBER"
                      className="mt-1 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none"
                    >
                      <option value="LEADER">Team Leader</option>
                      <option value="MEMBER">Team Member</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="reg-notes" className="text-xs font-medium text-foreground">
                  Notes / Topic (optional)
                </label>
                <textarea
                  id="reg-notes"
                  name="notes"
                  rows={2}
                  maxLength={500}
                  placeholder="Any project title, track preference, or notes…"
                  className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none"
                />
              </div>

              {regState.message && (
                <p className={`text-xs ${regState.status === 'error' ? 'text-destructive' : 'text-primary'}`}>
                  {regState.message}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterTarget(null)}
                  className="rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={regPending}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {regPending ? 'Submitting…' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Institution-Branded Participation Certificate Modal */}
      {certificateTarget && certificateTarget.myParticipation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Official Participation Certificate"
          onKeyDown={(e) => e.key === 'Escape' && setCertificateTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between print:hidden">
              <h3 className="text-sm font-semibold text-foreground">Official Participation Certificate</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  <Printer size={13} />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateTarget(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border-4 border-double border-primary/40 bg-background p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                {institutionLogoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={institutionLogoUrl} alt={institutionName} className="h-12 w-auto object-contain" />
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{institutionName}</p>
                <p className="text-[11px] text-muted-foreground">
                  Department of {certificateTarget.department.name}
                </p>
              </div>

              <h4 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
                Certificate of {certificateTarget.myParticipation.role === 'WINNER' ? 'Merit & Achievement' : certificateTarget.myParticipation.role === 'ORGANIZER' ? 'Coordination' : 'Participation'}
              </h4>

              <p className="mt-4 text-sm text-muted-foreground">This is to certify that</p>
              <p className="mt-1 text-xl font-bold text-foreground">{participantName}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                has {certificateTarget.myParticipation.role === 'WINNER'
                  ? `secured ${certificateTarget.myParticipation.position || 'a winning position'} in`
                  : certificateTarget.myParticipation.role === 'ORGANIZER'
                    ? 'served as an organizer for'
                    : 'actively participated in'}{' '}
                <span className="font-semibold text-foreground">{certificateTarget.title}</span>{' '}
                ({certificateTarget.level.replaceAll('_', ' ')}) held from{' '}
                {new Date(certificateTarget.startsAt).toLocaleDateString()} to{' '}
                {new Date(certificateTarget.endsAt).toLocaleDateString()}.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-left text-[11px] text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">Certificate Ref:</span>{' '}
                  <span className="font-mono">
                    {certificateTarget.myParticipation.certificateRef ?? 'VERIFIED-RECORD'}
                  </span>
                </div>
                {certificateTarget.myParticipation.certificateUrl && (
                  <a
                    href={certificateTarget.myParticipation.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline print:hidden"
                  >
                    External Certificate Link
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
