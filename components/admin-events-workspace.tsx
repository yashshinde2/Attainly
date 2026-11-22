'use client'

import { useActionState, useState } from 'react'
import {
  createEventAction,
  archiveEventAction,
  bulkEnterEventResultsAction,
  type EventActionState,
} from '@/app/actions/events'
import type { Department } from '@/generated/prisma/client'
import type { EventWithDetails } from '@/lib/server/repositories/event-repository'
import type { UserWithRole } from '@/lib/server/repositories/institution-user-repository'

const initialState: EventActionState = { status: 'idle', message: '' }
const fieldClass =
  'mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const labelClass = 'text-sm font-medium text-foreground'

function ActionMessage({ state }: { state: EventActionState }) {
  if (!state.message) return null
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`mt-3 text-sm ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}
    >
      {state.message}
    </p>
  )
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
        {pending ? 'Archiving…' : 'Archive'}
      </button>
      {state.status === 'error' && <span className="sr-only">{state.message}</span>}
    </form>
  )
}

function CreateEventForm({ departments }: { departments: Department[] }) {
  const [state, action, pending] = useActionState(createEventAction, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="event-title" className={labelClass}>Event title</label>
          <input
            id="event-title"
            name="title"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Annual Hackathon 2026"
          />
        </div>
        <div>
          <label htmlFor="event-type" className={labelClass}>Event category</label>
          <select id="event-type" name="type" required className={fieldClass} defaultValue="TECHNICAL">
            <option value="TECHNICAL">Technical</option>
            <option value="NON_TECHNICAL">Non-technical</option>
            <option value="SPORTS">Sports</option>
            <option value="CULTURAL">Cultural</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="event-dept" className={labelClass}>Hosting department</label>
          <select id="event-dept" name="departmentId" required className={fieldClass} defaultValue={departments[0]?.id ?? ''}>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} ({dept.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="event-start" className={labelClass}>Start date &amp; time</label>
          <input id="event-start" name="startsAt" type="datetime-local" required className={fieldClass} />
        </div>
        <div>
          <label htmlFor="event-end" className={labelClass}>End date &amp; time</label>
          <input id="event-end" name="endsAt" type="datetime-local" required className={fieldClass} />
        </div>
      </div>

      <div>
        <label htmlFor="event-desc" className={labelClass}>Description &amp; rules</label>
        <textarea
          id="event-desc"
          name="description"
          rows={3}
          maxLength={5000}
          className={fieldClass}
          placeholder="Brief details about the event, objectives, and criteria"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create event'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

interface ParticipantRow {
  userId: string
  role: 'PARTICIPANT' | 'WINNER' | 'ORGANIZER'
  position: string
  certificateUrl: string
}

function BulkResultEntryForm({
  events,
  users,
  selectedEventId,
  onSelectEvent,
}: {
  events: EventWithDetails[]
  users: UserWithRole[]
  selectedEventId: string
  onSelectEvent: (id: string) => void
}) {
  const [state, action, pending] = useActionState(bulkEnterEventResultsAction, initialState)
  const [rows, setRows] = useState<ParticipantRow[]>([
    { userId: users[0]?.id ?? '', role: 'WINNER', position: '1st Place', certificateUrl: '' },
  ])

  const addRow = () => {
    setRows([
      ...rows,
      { userId: users[0]?.id ?? '', role: 'PARTICIPANT', position: '', certificateUrl: '' },
    ])
  }

  const removeRow = (index: number) => {
    if (rows.length === 1) return
    setRows(rows.filter((_, idx) => idx !== index))
  }

  const updateRow = <K extends keyof ParticipantRow>(index: number, field: K, value: ParticipantRow[K]) => {
    const updated = [...rows]
    updated[index][field] = value
    setRows(updated)
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="select-event" className={labelClass}>Select event to enter results</label>
        <select
          id="select-event"
          name="eventId"
          value={selectedEventId}
          onChange={(e) => onSelectEvent(e.target.value)}
          required
          className={fieldClass}
        >
          <option value="" disabled>-- Select an event --</option>
          {events.map((evt) => (
            <option key={evt.id} value={evt.id}>
              {evt.title} ({evt.department.code} · {evt.type})
            </option>
          ))}
        </select>
      </div>

      <input type="hidden" name="resultsJson" value={JSON.stringify(rows)} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Participant Results ({rows.length})</p>
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            + Add participant
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid items-center gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <label className="text-xs font-medium text-muted-foreground">User</label>
                <select
                  value={row.userId}
                  onChange={(e) => updateRow(idx, 'userId', e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.role.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  value={row.role}
                  onChange={(e) => updateRow(idx, 'role', e.target.value as 'PARTICIPANT' | 'WINNER' | 'ORGANIZER')}
                  className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs"
                >
                  <option value="WINNER">Winner</option>
                  <option value="PARTICIPANT">Participant</option>
                  <option value="ORGANIZER">Organizer</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-muted-foreground">Recognition / Position</label>
                <input
                  type="text"
                  value={row.position}
                  onChange={(e) => updateRow(idx, 'position', e.target.value)}
                  placeholder="e.g. 1st Place"
                  maxLength={80}
                  className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Certificate URL</label>
                <input
                  type="text"
                  value={row.certificateUrl}
                  onChange={(e) => updateRow(idx, 'certificateUrl', e.target.value)}
                  placeholder="https://..."
                  maxLength={2000}
                  className="mt-1 w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs"
                />
              </div>

              <div className="sm:col-span-1 flex justify-end pt-4 sm:pt-0">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  disabled={rows.length <= 1}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                  title="Remove row"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending || !selectedEventId}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Recording results…' : 'Save all results in one submission'}
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
}: {
  departments: Department[]
  events: EventWithDetails[]
  users: UserWithRole[]
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id ?? '')

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Create Event Section */}
      <section aria-labelledby="create-event-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="create-event-heading" className="text-lg font-semibold">Event Management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and manage institutional hackathons, symposiums, sports, and cultural festivals.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        <CreateEventForm departments={departments} />

        {/* Events Table */}
        <div className="mt-6">
          {events.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-4">Title</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Department</th>
                    <th className="pb-3 pr-4">Schedule</th>
                    <th className="pb-3 pr-4">Participants</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((evt) => (
                    <tr key={evt.id} className="transition hover:bg-muted/40">
                      <td className="py-3.5 pr-4 font-medium text-foreground">{evt.title}</td>
                      <td className="py-3.5 pr-4">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {evt.type.replaceAll('_', ' ').toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                        {evt.department.name} ({evt.department.code})
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                        {new Date(evt.startsAt).toLocaleDateString()} &rarr; {new Date(evt.endsAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 pr-4 text-xs font-medium text-muted-foreground">
                        {evt._count?.participation ?? 0}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedEventId(evt.id)}
                            className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:opacity-90"
                          >
                            Enter results
                          </button>
                          <ArchiveEventButton eventId={evt.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
              No events scheduled yet. Create an event using the form above.
            </p>
          )}
        </div>
      </section>

      {/* Bulk Result Entry Section */}
      <section aria-labelledby="bulk-results-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6">
          <h2 id="bulk-results-heading" className="text-lg font-semibold">Bulk Enter Participation Results</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Award winners, participants, and student/faculty coordinators for an event in one submission.
          </p>
        </div>

        {events.length ? (
          <BulkResultEntryForm
            events={events}
            users={users}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
            Create an event first to enter participation results.
          </p>
        )}
      </section>
    </div>
  )
}
