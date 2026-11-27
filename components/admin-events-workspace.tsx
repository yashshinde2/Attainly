'use client'

import { useActionState, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  archiveEventAction,
  bulkEnterEventResultsAction,
  bulkImportParticipantsAction,
  createEventAction,
  saveEventCompletionAction,
  syncEventToProfilesAction,
  updateAttendanceAction,
  updateEventAction,
  upsertEventCategoryAction,
  type EventActionState,
} from '@/app/actions/events'
import type { Department } from '@/generated/prisma/client'
import type { EventWithDetails } from '@/lib/server/repositories/event-repository'
import type { UserWithRole } from '@/lib/server/repositories/institution-user-repository'
import { escapeCsvCell } from '@/lib/csv'
import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck2,
  Plus,
  RefreshCw,
  Tag,
  Users,
} from 'lucide-react'

const initialState: EventActionState = { status: 'idle', message: '' }
const fieldClass =
  'mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const labelClass = 'text-xs font-medium text-foreground'

function ActionMessage({ state }: { state: EventActionState }) {
  if (!state.message) return null
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`mt-2 text-xs font-medium ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}
    >
      {state.message}
    </p>
  )
}

function toLocalDatetimeInput(val: Date | string | null | undefined): string {
  if (!val) return ''
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface EventCategoryOption {
  id: string
  code: string
  label: string
  subcategories: string[]
  isActive: boolean
}

export interface EventReportData {
  kpis: {
    totalEvents: number
    publishedEvents: number
    completedEvents: number
    draftEvents: number
    totalRegistrations: number
    totalConfirmedOrAttended: number
    totalWinners: number
    certificatesIssued: number
    syncedRecords: number
  }
  departmentStats: Array<{
    departmentId: string
    code: string
    name: string
    events: number
    completed: number
    registrations: number
    attended: number
    winners: number
  }>
  categoryStats: Array<{ category: string; events: number; participants: number }>
  eventRows: Array<{
    id: string
    title: string
    departmentName: string
    departmentCode: string
    category: string
    subcategory: string | null
    level: string
    mode: string
    status: string
    startsAt: Date | string
    endsAt: Date | string
    registeredCount: number
    attendedCount: number
    absentCount: number
    winnersCount: number
    certificatesIssued: number
    hasCompletionSummary: boolean
  }>
}

function ArchiveEventButton({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(archiveEventAction, initialState)
  return (
    <form action={action} className="inline">
      <input type="hidden" name="eventId" value={eventId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {pending ? '…' : 'Delete'}
      </button>
      {state.status === 'error' && <span className="sr-only">{state.message}</span>}
    </form>
  )
}

function EventEditorForm({
  departments,
  categories,
  coordinators,
  editingEvent,
  onDoneEditing,
}: {
  departments: Department[]
  categories: EventCategoryOption[]
  coordinators: UserWithRole[]
  editingEvent: EventWithDetails | null
  onDoneEditing: () => void
}) {
  const actionFn = editingEvent ? updateEventAction : createEventAction
  const [state, action, pending] = useActionState(actionFn, initialState)
  const [selectedCat, setSelectedCat] = useState<string>(
    editingEvent?.categoryCode ?? categories[0]?.code ?? 'HACKATHON',
  )

  const currentCatObj = categories.find((c) => c.code === selectedCat)

  return (
    <form key={editingEvent?.id ?? 'new'} action={action} className="space-y-5">
      {editingEvent && <input type="hidden" name="eventId" value={editingEvent.id} />}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {editingEvent ? `Edit Event: ${editingEvent.title}` : 'Create New Institutional Event'}
        </h3>
        {editingEvent && (
          <button
            type="button"
            onClick={onDoneEditing}
            className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="evt-title" className={labelClass}>Event Title *</label>
          <input
            id="evt-title"
            name="title"
            required
            maxLength={180}
            defaultValue={editingEvent?.title ?? ''}
            className={fieldClass}
            placeholder="e.g. National Smart Campus Hackathon 2026"
          />
        </div>
        <div>
          <label htmlFor="evt-status" className={labelClass}>Status</label>
          <select id="evt-status" name="status" defaultValue={editingEvent?.status ?? 'PUBLISHED'} className={fieldClass}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="evt-cat" className={labelClass}>Category</label>
          <select
            id="evt-cat"
            name="categoryCode"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className={fieldClass}
          >
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="evt-subcat" className={labelClass}>Subcategory</label>
          <input
            id="evt-subcat"
            name="subcategory"
            list="evt-subcat-list"
            defaultValue={editingEvent?.subcategory ?? ''}
            placeholder="Select or type…"
            className={fieldClass}
          />
          <datalist id="evt-subcat-list">
            {(currentCatObj?.subcategories ?? []).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="evt-dept" className={labelClass}>Organizing Department *</label>
          <select
            id="evt-dept"
            name="departmentId"
            required
            defaultValue={editingEvent?.departmentId ?? departments[0]?.id ?? ''}
            className={fieldClass}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="evt-coord" className={labelClass}>Event Coordinator</label>
          <select
            id="evt-coord"
            name="coordinatorUserId"
            defaultValue={editingEvent?.coordinatorUserId ?? ''}
            className={fieldClass}
          >
            <option value="">Unassigned</option>
            {coordinators.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role.key})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="evt-mode" className={labelClass}>Mode</label>
          <select id="evt-mode" name="mode" defaultValue={editingEvent?.mode ?? 'OFFLINE'} className={fieldClass}>
            <option value="OFFLINE">Offline</option>
            <option value="ONLINE">Online</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>
        <div>
          <label htmlFor="evt-level" className={labelClass}>Event Level</label>
          <select id="evt-level" name="level" defaultValue={editingEvent?.level ?? 'INSTITUTION'} className={fieldClass}>
            <option value="DEPARTMENT">Department</option>
            <option value="INSTITUTION">Institution</option>
            <option value="INTER_COLLEGIATE">Inter-Collegiate</option>
            <option value="STATE">State</option>
            <option value="NATIONAL">National</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="evt-venue" className={labelClass}>Venue / Meeting Link</label>
          <input
            id="evt-venue"
            name="venue"
            maxLength={240}
            defaultValue={editingEvent?.venue ?? ''}
            placeholder="e.g. Main Auditorium / Zoom Link"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="evt-start" className={labelClass}>Start Date &amp; Time *</label>
          <input
            id="evt-start"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toLocalDatetimeInput(editingEvent?.startsAt)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="evt-end" className={labelClass}>End Date &amp; Time *</label>
          <input
            id="evt-end"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={toLocalDatetimeInput(editingEvent?.endsAt)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="evt-deadline" className={labelClass}>Registration Deadline</label>
          <input
            id="evt-deadline"
            name="registrationDeadline"
            type="datetime-local"
            defaultValue={toLocalDatetimeInput(editingEvent?.registrationDeadline)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="evt-cap" className={labelClass}>Max Capacity</label>
          <input
            id="evt-cap"
            name="capacity"
            type="number"
            min={1}
            defaultValue={editingEvent?.capacity ?? ''}
            placeholder="Unlimited"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-background p-4 sm:grid-cols-3">
        <div>
          <span className={labelClass}>Eligible Roles</span>
          <div className="mt-2 flex gap-4">
            <label className="inline-flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                name="eligibilityRoles"
                value="STUDENT"
                defaultChecked={editingEvent ? editingEvent.eligibilityRoles.includes('STUDENT') : true}
              />
              Students
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                name="eligibilityRoles"
                value="FACULTY"
                defaultChecked={editingEvent ? editingEvent.eligibilityRoles.includes('FACULTY') : true}
              />
              Faculty
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="evt-batches" className={labelClass}>Eligible Admission Years (comma-separated)</label>
          <input
            id="evt-batches"
            name="eligibleBatches"
            defaultValue={editingEvent?.eligibleBatches?.join(', ') ?? ''}
            placeholder="e.g. 2023, 2024 (blank = all)"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col justify-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              name="allowTeamRegistration"
              defaultChecked={editingEvent?.allowTeamRegistration ?? false}
            />
            Allow Team Registration
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              name="certificateTemplateEnabled"
              defaultChecked={editingEvent?.certificateTemplateEnabled ?? true}
            />
            Issue Institution Participation Certificates
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="evt-desc" className={labelClass}>Description &amp; Guidelines</label>
          <textarea
            id="evt-desc"
            name="description"
            rows={3}
            defaultValue={editingEvent?.description ?? ''}
            placeholder="Event objectives, rules, judging criteria…"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="evt-docs" className={labelClass}>Supporting Document / Brochure URLs (one per line)</label>
          <textarea
            id="evt-docs"
            name="supportingDocUrls"
            rows={3}
            defaultValue={editingEvent?.supportingDocUrls?.join('\n') ?? ''}
            placeholder="https://..."
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <Plus size={15} />
          {pending ? 'Saving…' : editingEvent ? 'Update Event' : 'Create Event'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

export function AdminEventsWorkspace({
  departments,
  events,
  users,
  categories,
  academicYears,
  reports,
  activeDepartmentFilter,
  activeAcademicYearFilter,
}: {
  departments: Department[]
  events: EventWithDetails[]
  users: UserWithRole[]
  categories: EventCategoryOption[]
  academicYears: Array<{ id: string; label: string }>
  reports: EventReportData
  activeDepartmentFilter: string
  activeAcademicYearFilter: string
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'manage' | 'completion' | 'categories' | 'reports'>('events')
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ?? '')
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const coordinators = useMemo(
    () => users.filter((u) => u.isActive && u.role.key !== 'STUDENT'),
    [users],
  )
  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? events[0] ?? null,
    [events, selectedEventId],
  )

  const filteredEvents = useMemo(
    () => events.filter((e) => statusFilter === 'ALL' || e.status === statusFilter),
    [events, statusFilter],
  )

  // Manage tab states
  const [importState, importAction, importPending] = useActionState(bulkImportParticipantsAction, initialState)
  const [attState, attAction, attPending] = useActionState(updateAttendanceAction, initialState)
  const [resState, resAction, resPending] = useActionState(bulkEnterEventResultsAction, initialState)
  const [syncState, syncAction, syncPending] = useActionState(syncEventToProfilesAction, initialState)
  const [compState, compAction, compPending] = useActionState(saveEventCompletionAction, initialState)
  const [catState, catAction, catPending] = useActionState(upsertEventCategoryAction, initialState)

  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, { attendanceStatus: string; confirmParticipation: boolean }>>({})
  const [resultRows, setResultRows] = useState<Array<{ userId: string; role: string; position: string; certificateUrl: string }>>([
    { userId: '', role: 'PARTICIPANT', position: '', certificateUrl: '' },
  ])

  const exportReportsCsv = () => {
    const header = ['Title', 'Department', 'Category', 'Level', 'Mode', 'Status', 'Registered', 'Attended', 'Absent', 'Winners', 'Certificates']
    const rows = reports.eventRows.map((r) => [
      r.title,
      `${r.departmentName} (${r.departmentCode})`,
      r.category,
      r.level,
      r.mode,
      r.status,
      String(r.registeredCount),
      String(r.attendedCount),
      String(r.absentCount),
      String(r.winnersCount),
      String(r.certificatesIssued),
    ])
    const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attainly-event-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Institutional Event Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage event lifecycle, eligibility, attendance, results, profile sync, and accreditation reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-card p-1.5">
          {[
            { id: 'events', label: 'Events & Calendar' },
            { id: 'create', label: editingEvent ? 'Edit Event' : 'Create Event' },
            { id: 'manage', label: 'Attendance & Results' },
            { id: 'completion', label: 'Completion Summary' },
            { id: 'categories', label: 'Categories' },
            { id: 'reports', label: 'Event Reports' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Events & Calendar */}
      {activeTab === 'events' && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium"
              >
                <CalendarDays size={13} />
                {viewMode === 'table' ? 'Calendar View' : 'Table View'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null)
                  setActiveTab('create')
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Plus size={13} />
                New Event
              </button>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No events found for the selected filter.
            </p>
          ) : viewMode === 'calendar' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((evt) => (
                <div key={evt.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">{new Date(evt.startsAt).toLocaleDateString()}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">{evt.status}</span>
                  </div>
                  <p className="mt-2 font-semibold text-foreground">{evt.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {evt.department.code} &middot; {evt.mode} &middot; {evt._count?.participation ?? 0} participants
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Event</th>
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Department</th>
                    <th className="pb-3 pr-4">Schedule</th>
                    <th className="pb-3 pr-4">Participants</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-muted/40">
                      <td className="py-3 pr-4 font-medium text-foreground">
                        <div>{evt.title}</div>
                        {evt.venue && <div className="text-[11px] text-muted-foreground">{evt.venue}</div>}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {evt.categoryCode ?? evt.type}
                        {evt.subcategory ? ` / ${evt.subcategory}` : ''}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{evt.department.code}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(evt.startsAt).toLocaleDateString()} &rarr; {new Date(evt.endsAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-xs font-medium">
                        {evt._count?.participation ?? 0}{evt.capacity ? ` / ${evt.capacity}` : ''}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEvent(evt)
                              setActiveTab('create')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-xs font-medium"
                          >
                            <Edit3 size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventId(evt.id)
                              setActiveTab('manage')
                            }}
                            className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                          >
                            Manage
                          </button>
                          <ArchiveEventButton eventId={evt.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Create / Edit Event */}
      {activeTab === 'create' && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <EventEditorForm
            departments={departments}
            categories={categories}
            coordinators={coordinators}
            editingEvent={editingEvent}
            onDoneEditing={() => {
              setEditingEvent(null)
              setActiveTab('events')
            }}
          />
        </section>
      )}

      {/* TAB 3: Attendance, Bulk Import, Results & Profile Sync */}
      {activeTab === 'manage' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <label htmlFor="manage-evt-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Event:
              </label>
              <select
                id="manage-evt-select"
                value={selectedEvent?.id ?? ''}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-foreground"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.department.code})
                  </option>
                ))}
              </select>
            </div>
            {selectedEvent && (
              <form action={syncAction} className="flex items-center gap-3">
                <input type="hidden" name="eventId" value={selectedEvent.id} />
                <button
                  type="submit"
                  disabled={syncPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <RefreshCw size={13} />
                  {syncPending ? 'Syncing…' : 'Sync Confirmed Records to Profiles'}
                </button>
                <ActionMessage state={syncState} />
              </form>
            )}
          </div>

          {selectedEvent && (
            <>
              {/* Attendance & Confirmation Table */}
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">Registered Participants &amp; Attendance</h3>
                    <p className="text-xs text-muted-foreground">
                      Registration and confirmed participation are separate. Mark attendance and confirm to sync to profiles.
                    </p>
                  </div>
                </div>

                {selectedEvent.participation && selectedEvent.participation.length > 0 ? (
                  <form action={attAction} className="space-y-4">
                    <input type="hidden" name="eventId" value={selectedEvent.id} />
                    <input
                      type="hidden"
                      name="entriesJson"
                      value={JSON.stringify(
                        selectedEvent.participation.map((p) => {
                          const d = attendanceDraft[p.userId]
                          return {
                            userId: p.userId,
                            attendanceStatus: d?.attendanceStatus ?? p.attendanceStatus ?? 'PENDING',
                            confirmParticipation: d?.confirmParticipation ?? (p.registrationStatus === 'CONFIRMED'),
                          }
                        }),
                      )}
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="pb-2.5 pr-4">Participant</th>
                            <th className="pb-2.5 pr-4">Role / Team</th>
                            <th className="pb-2.5 pr-4">Reg Status</th>
                            <th className="pb-2.5 pr-4">Attendance</th>
                            <th className="pb-2.5 pr-4">Confirm &amp; Sync</th>
                            <th className="pb-2.5">Profile / Cert</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {selectedEvent.participation.map((p) => {
                            const draft = attendanceDraft[p.userId] ?? {
                              attendanceStatus: p.attendanceStatus ?? 'PENDING',
                              confirmParticipation: p.registrationStatus === 'CONFIRMED',
                            }
                            return (
                              <tr key={p.id}>
                                <td className="py-2.5 pr-4 font-medium text-foreground">
                                  {p.user.firstName} {p.user.lastName}
                                  <div className="text-[11px] text-muted-foreground">{p.user.email}</div>
                                </td>
                                <td className="py-2.5 pr-4">
                                  {p.role}{p.position ? ` (${p.position})` : ''}
                                  {p.teamName && <div className="text-[11px] text-muted-foreground">Team: {p.teamName}</div>}
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                                    {p.registrationStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <select
                                    value={draft.attendanceStatus}
                                    onChange={(e) =>
                                      setAttendanceDraft((prev) => ({
                                        ...prev,
                                        [p.userId]: { ...draft, attendanceStatus: e.target.value },
                                      }))
                                    }
                                    className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                                  >
                                    <option value="PENDING">Pending</option>
                                    <option value="PRESENT">Present</option>
                                    <option value="ABSENT">Absent</option>
                                  </select>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <input
                                    type="checkbox"
                                    checked={draft.confirmParticipation}
                                    onChange={(e) =>
                                      setAttendanceDraft((prev) => ({
                                        ...prev,
                                        [p.userId]: { ...draft, confirmParticipation: e.target.checked },
                                      }))
                                    }
                                  />
                                </td>
                                <td className="py-2.5 font-mono text-[11px] text-muted-foreground">
                                  {p.certificateRef ?? (p.syncedAchievementId || p.syncedContributionId ? 'Synced' : '—')}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={attPending}
                        className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        {attPending ? 'Saving…' : 'Save Attendance & Confirm'}
                      </button>
                      <ActionMessage state={attState} />
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">No participants registered yet. Use Bulk Import below or wait for registrations.</p>
                )}
              </section>

              {/* Bulk Import Participants */}
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h3 className="text-base font-semibold">Bulk Import Participants</h3>
                <p className="mt-1 text-xs text-muted-foreground">Select multiple students or faculty to register or pre-confirm for this event.</p>
                <form action={importAction} className="mt-4 space-y-4">
                  <input type="hidden" name="eventId" value={selectedEvent.id} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label htmlFor="bulk-users" className={labelClass}>Select Users (Ctrl/Cmd + Click for multiple)</label>
                      <select
                        id="bulk-users"
                        name="userIds"
                        multiple
                        size={5}
                        required
                        className={fieldClass}
                      >
                        {users.filter((u) => u.isActive).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.role.key}) — {u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="bulk-role" className={labelClass}>Role</label>
                        <select id="bulk-role" name="role" className={fieldClass} defaultValue="PARTICIPANT">
                          <option value="PARTICIPANT">Participant</option>
                          <option value="ORGANIZER">Organizer</option>
                          <option value="WINNER">Winner</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="bulk-status" className={labelClass}>Initial State</label>
                        <select id="bulk-status" name="registrationStatus" className={fieldClass} defaultValue="REGISTERED">
                          <option value="REGISTERED">Registered (Pending Attendance)</option>
                          <option value="CONFIRMED">Confirmed &amp; Synced</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={importPending}
                      className="rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:bg-muted"
                    >
                      {importPending ? 'Importing…' : 'Import Selected Participants'}
                    </button>
                    <ActionMessage state={importState} />
                  </div>
                </form>
              </section>

              {/* Enter Awards & Results */}
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h3 className="text-base font-semibold">Declare Results &amp; Awards</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirming winners or participants automatically creates/updates their Student Achievements or Faculty Contributions idempotently.
                </p>
                <form action={resAction} className="mt-4 space-y-3">
                  <input type="hidden" name="eventId" value={selectedEvent.id} />
                  <input
                    type="hidden"
                    name="resultsJson"
                    value={JSON.stringify(
                      resultRows
                        .filter((r) => r.userId)
                        .map((r) => ({
                          userId: r.userId,
                          role: r.role,
                          position: r.position.trim() || null,
                          certificateUrl: r.certificateUrl.trim() || null,
                        })),
                    )}
                  />
                  {resultRows.map((row, idx) => (
                    <div key={idx} className="grid gap-2 sm:grid-cols-12 items-center">
                      <select
                        value={row.userId}
                        onChange={(e) =>
                          setResultRows((prev) => prev.map((r, i) => (i === idx ? { ...r, userId: e.target.value } : r)))
                        }
                        className="sm:col-span-4 rounded-xl border border-input bg-background px-3 py-2 text-xs"
                      >
                        <option value="">Select user…</option>
                        {users.filter((u) => u.isActive).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({u.role.key})
                          </option>
                        ))}
                      </select>
                      <select
                        value={row.role}
                        onChange={(e) =>
                          setResultRows((prev) => prev.map((r, i) => (i === idx ? { ...r, role: e.target.value } : r)))
                        }
                        className="sm:col-span-2 rounded-xl border border-input bg-background px-3 py-2 text-xs"
                      >
                        <option value="PARTICIPANT">Participant</option>
                        <option value="WINNER">Winner</option>
                        <option value="ORGANIZER">Organizer</option>
                      </select>
                      <input
                        value={row.position}
                        onChange={(e) =>
                          setResultRows((prev) => prev.map((r, i) => (i === idx ? { ...r, position: e.target.value } : r)))
                        }
                        placeholder="Position / Award (e.g. 1st Place)"
                        className="sm:col-span-3 rounded-xl border border-input bg-background px-3 py-2 text-xs"
                      />
                      <input
                        value={row.certificateUrl}
                        onChange={(e) =>
                          setResultRows((prev) => prev.map((r, i) => (i === idx ? { ...r, certificateUrl: e.target.value } : r)))
                        }
                        placeholder="Certificate URL (optional)"
                        className="sm:col-span-2 rounded-xl border border-input bg-background px-3 py-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setResultRows((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={resultRows.length <= 1}
                        className="sm:col-span-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-30"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setResultRows((prev) => [...prev, { userId: '', role: 'PARTICIPANT', position: '', certificateUrl: '' }])
                      }
                      className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground"
                    >
                      + Add Row
                    </button>
                    <button
                      type="submit"
                      disabled={resPending}
                      className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      {resPending ? 'Saving…' : 'Save Results & Sync Profiles'}
                    </button>
                    <ActionMessage state={resState} />
                  </div>
                </form>
              </section>
            </>
          )}
        </div>
      )}

      {/* TAB 4: Completion Summary */}
      {activeTab === 'completion' && selectedEvent && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-base font-semibold">Event Completion Summary &amp; Evidence</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Document post-event outcomes, feedback, photographs, and report links for {selectedEvent.title}.
          </p>
          <form key={selectedEvent.id} action={compAction} className="mt-5 space-y-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <div>
              <label htmlFor="comp-summary" className={labelClass}>Completion Summary *</label>
              <textarea
                id="comp-summary"
                name="completionSummary"
                required
                rows={4}
                defaultValue={selectedEvent.completionSummary ?? ''}
                placeholder="Key outcomes, attendance highlights, speakers/judges, and impact…"
                className={fieldClass}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="comp-report" className={labelClass}>Official Report URL</label>
                <input
                  id="comp-report"
                  name="completionReportUrl"
                  defaultValue={selectedEvent.completionReportUrl ?? ''}
                  placeholder="https://..."
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="comp-feedback" className={labelClass}>Participant Feedback Summary</label>
                <input
                  id="comp-feedback"
                  name="feedbackSummary"
                  defaultValue={selectedEvent.feedbackSummary ?? ''}
                  placeholder="e.g. 4.7/5 average rating across 120 responses"
                  className={fieldClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="comp-photos" className={labelClass}>Event Photograph URLs (one per line)</label>
              <textarea
                id="comp-photos"
                name="completionPhotoUrls"
                rows={3}
                defaultValue={selectedEvent.completionPhotoUrls?.join('\n') ?? ''}
                placeholder="https://..."
                className={fieldClass}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={compPending}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {compPending ? 'Saving…' : 'Save Summary & Mark Completed'}
              </button>
              <ActionMessage state={compState} />
            </div>
          </form>
        </section>
      )}

      {/* TAB 5: Configurable Categories */}
      {activeTab === 'categories' && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-base font-semibold">Configurable Event Categories &amp; Subcategories</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Customize institutional event categories and subcategories for event creation and reporting.
          </p>
          <form action={catAction} className="mt-4 grid gap-4 border-b border-border pb-6 sm:grid-cols-3">
            <div>
              <label htmlFor="cat-code" className={labelClass}>Category Code *</label>
              <input id="cat-code" name="code" required placeholder="e.g. HACKATHON" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="cat-label" className={labelClass}>Display Label *</label>
              <input id="cat-label" name="label" required placeholder="e.g. Hackathon" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="cat-subs" className={labelClass}>Subcategories (comma-separated)</label>
              <input id="cat-subs" name="subcategories" placeholder="Ideathon, Code Sprint" className={fieldClass} />
            </div>
            <div className="sm:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={catPending}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                {catPending ? 'Saving…' : 'Save Category'}
              </button>
              <ActionMessage state={catState} />
            </div>
          </form>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{c.label}</span>
                  <span className="font-mono text-[11px] text-primary">{c.code}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {c.subcategories.length ? c.subcategories.join(', ') : 'No subcategories configured'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 6: Event Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={activeDepartmentFilter}
                onChange={(e) => {
                  const p = new URLSearchParams()
                  if (e.target.value) p.set('departmentId', e.target.value)
                  if (activeAcademicYearFilter) p.set('academicYearId', activeAcademicYearFilter)
                  router.push(`/admin/events?${p.toString()}`)
                }}
                className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
              <select
                value={activeAcademicYearFilter}
                onChange={(e) => {
                  const p = new URLSearchParams()
                  if (activeDepartmentFilter) p.set('departmentId', activeDepartmentFilter)
                  if (e.target.value) p.set('academicYearId', e.target.value)
                  router.push(`/admin/events?${p.toString()}`)
                }}
                className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium"
              >
                <option value="">All Academic Years</option>
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>{ay.label}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={exportReportsCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              <Download size={13} />
              Export Event Report CSV
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Events', val: reports.kpis.totalEvents, sub: `${reports.kpis.completedEvents} completed` },
              { label: 'Total Registrations', val: reports.kpis.totalRegistrations, sub: `${reports.kpis.totalConfirmedOrAttended} confirmed/attended` },
              { label: 'Winners & Awards', val: reports.kpis.totalWinners, sub: `${reports.kpis.certificatesIssued} certificates issued` },
              { label: 'Synced Profile Records', val: reports.kpis.syncedRecords, sub: 'Student & Faculty records' },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{k.val}</p>
                <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Department-wise Event Statistics */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="mb-4 text-base font-semibold">Department-wise Event Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2.5 pr-4">Department</th>
                    <th className="pb-2.5 pr-4">Events</th>
                    <th className="pb-2.5 pr-4">Completed</th>
                    <th className="pb-2.5 pr-4">Registrations</th>
                    <th className="pb-2.5 pr-4">Attended</th>
                    <th className="pb-2.5">Winners</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.departmentStats.map((d) => (
                    <tr key={d.departmentId}>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{d.name} ({d.code})</td>
                      <td className="py-2.5 pr-4">{d.events}</td>
                      <td className="py-2.5 pr-4">{d.completed}</td>
                      <td className="py-2.5 pr-4">{d.registrations}</td>
                      <td className="py-2.5 pr-4">{d.attended}</td>
                      <td className="py-2.5">{d.winners}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Participation & Attendance Report */}
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="mb-4 text-base font-semibold">Event Participation &amp; Attendance Report</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2.5 pr-4">Event</th>
                    <th className="pb-2.5 pr-4">Dept</th>
                    <th className="pb-2.5 pr-4">Category</th>
                    <th className="pb-2.5 pr-4">Status</th>
                    <th className="pb-2.5 pr-4">Registered</th>
                    <th className="pb-2.5 pr-4">Attended</th>
                    <th className="pb-2.5 pr-4">Absent</th>
                    <th className="pb-2.5 pr-4">Winners</th>
                    <th className="pb-2.5">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.eventRows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 pr-4 font-medium text-foreground">{r.title}</td>
                      <td className="py-2.5 pr-4">{r.departmentCode}</td>
                      <td className="py-2.5 pr-4">{r.category}</td>
                      <td className="py-2.5 pr-4">{r.status}</td>
                      <td className="py-2.5 pr-4">{r.registeredCount}</td>
                      <td className="py-2.5 pr-4">{r.attendedCount}</td>
                      <td className="py-2.5 pr-4">{r.absentCount}</td>
                      <td className="py-2.5 pr-4">{r.winnersCount}</td>
                      <td className="py-2.5">{r.hasCompletionSummary ? 'Recorded' : 'Pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
